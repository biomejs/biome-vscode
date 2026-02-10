import {
	ConfigurationTarget,
	commands,
	type ExtensionContext,
	type TextEditor,
	Uri,
	type WorkspaceFolder,
	window,
	workspace,
} from "vscode";
import { Utils } from "vscode-uri";
import { version } from "../package.json";
import Biome from "./biome";
import { supportedLanguages } from "./constants";
import Logger from "./logger";
import { StatusBar } from "./status-bar";
import type { ExecutionMode } from "./types";
import { config, debounce } from "./utils";

export default class Extension {
	/**
	 * The extension's instance
	 *
	 * This is a singleton instance of the extension. It is created when the
	 * extension is activated and is used to manage the extension's lifecycle.
	 */
	private static instance: Extension;

	/**
	 * The extension's main logger
	 */
	private logger: Logger;

	/**
	 * The extension's status bar
	 */
	private statusBar: StatusBar;

	/**
	 * Workspace Biome instances
	 *
	 * The extension creates a dedicated Biome instance for every workspace folder
	 * in the workspace. This allows the extension to provide Biome support for
	 * each workspace folder independently.
	 */
	public biomes: Map<WorkspaceFolder | "global" | "single", Biome>;

	/**
	 * The extension's execution mode
	 */
	public get mode(): ExecutionMode {
		if (workspace.workspaceFolders === undefined) {
			return "single-file";
		}

		return workspace.workspaceFolders.length > 1 ? "multi-root" : "single-root";
	}

	/**
	 * The currently focused Biome instance
	 *
	 * This property returns the Biome instance to which the file in the active
	 * text editor belongs to.
	 */
	public get biome(): Biome | undefined {
		const editor = window.activeTextEditor;

		if (!editor) {
			return undefined;
		}

		// Untitled documents are always handled by the global instance
		if (editor.document.isUntitled) {
			return this.biomes.get("global");
		}

		// VS Code settings files are also handled by the global instance
		if (editor.document.uri.scheme === "vscode-userdata") {
			return this.biomes.get("global");
		}

		// If running in single-file mode, we return the single file instance
		if (this.mode === "single-file") {
			return this.biomes.get("single");
		}

		// Otherwise, check to which workspace folder the document belongs to
		// and return the corresponding Biome instance
		const folder = workspace.getWorkspaceFolder(editor.document.uri);

		if (folder) {
			return this.biomes.get(folder);
		}

		return undefined;
	}

	/**
	 * Creates a new instance of the extension.
	 *
	 * One should use the `createFromContext` method to create an instance of the
	 * extension, as this method will ensure that the instance is a singleton.
	 */
	private constructor(public readonly context: ExtensionContext) {
		this.logger = new Logger("Biome");
		this.statusBar = new StatusBar(this);
		this.biomes = new Map();
	}

	/**
	 * Creates the extension from the context
	 */
	public static create(context: ExtensionContext): Extension {
		Extension.instance ??= new Extension(context);
		return Extension.instance;
	}

	/**
	 * Initializes the extension
	 *
	 * This method will be called when the extension is activated. It will
	 * register the commands and start the extension.
	 */
	public async init(): Promise<void> {
		this.registerCommands();

		await this.trustBiomeDomain();

		await this.start();

		// When workspace folders change, restart everything
		workspace.onDidChangeWorkspaceFolders(async () => {
			this.logger.info("🔍 Workspace folders changed.");
			await this.restart();
		});
	}

	/**
	 * Starts the extension
	 *
	 * This method will start the extension, taking care of creating and
	 * starting the Biome instances for all workspace folders, as well as
	 * the global instance for files that do not belong to any workspace
	 * folder.
	 */
	public async start() {
		// Fancy-looking separator
		this.logger.info(` ${"-".repeat(40)} `);

		// Say hello
		this.logger.info(`🚀 Biome extension ${version}.`);

		this.logger.info(
			{
				"single-file": "✨ Running in single-file mode.",
				"single-root": "✨ Running in single-root workspace mode.",
				"multi-root": "✨ Running in multi-root workspace mode.",
			}[this.mode],
		);

		// Create the Biome instance before the status bar so we can show their state
		await this.createInstances();

		// Render the status bar for the first time
		this.statusBar.update();

		// Register callbacks to refresh the status bar with the state of the
		// active Biome instance
		for (const [_folder, biome] of this.biomes) {
			biome.onStateChange(() => {
				if (biome === this.biome) {
					this.statusBar.update();
				}
			});
		}

		// Register a callback to update the status bar when the active text editor changes
		window.onDidChangeActiveTextEditor(() => {
			this.statusBar.update();
		});

		// Finally, start the instances
		await this.startInstances();

		this.logger.info(`✨ See the dedicated logging channels for more details.`);
	}

	/**
	 * Stops the extension
	 *
	 * This method will stop the extension, while taking care of cleaning up
	 * any resources that were created during the extension's lifecycle.
	 */
	public async stop(): Promise<void> {
		this.logger.trace("⏹️ Stopping Biome extension...");

		for (const [_folder, biome] of this.biomes) {
			await biome.stop();
			this.biomes.delete(_folder);
		}

		this.logger.info("⏹️ Biome extension stopped.");
	}

	/**
	 * Restarts the extension
	 *
	 * This method will stop the extension and then start it again.
	 */
	public async restart(): Promise<void> {
		await this.stop();
		this.logger.info("🔄 Restarting Biome extension...");
		await this.start();
	}

	/**
	 * Registers the extension's commands
	 */
	private registerCommands(): void {
		const showLogsCommand = commands.registerCommand("biome.showLogs", () =>
			this.biome?.logger.show(true),
		);

		const restartCommand = commands.registerCommand(
			"biome.restart",
			async () => {
				await this.stop();
				await this.start();
			},
		);

		this.context.subscriptions.push(...[showLogsCommand, restartCommand]);
	}

	private async createInstances(): Promise<void> {
		if (this.mode === "single-file") {
			await this.createSingleFileInstance();
		} else if (this.mode === "single-root" || this.mode === "multi-root") {
			await this.createWorkspaceInstances();
		}

		await this.createGlobalInstance();

		this.logger.info(`🚀 Created ${this.biomes.size} Biome instance(s).`);
	}

	/**
	 * Creates a Biome instance for a single file
	 */
	private async createSingleFileInstance(): Promise<void> {
		// Retrieve the URI of the active editor
		const singleFileURI = window.activeTextEditor?.document.uri;

		if (!singleFileURI) {
			this.logger.error(
				"❌ Unable to start Biome for single file: no active editor.",
			);
			return;
		}

		// Retrieve the path to the parent folder of the single file
		const parentFolderURI = Uri.file(
			Utils.resolvePath(singleFileURI, "..").fsPath,
		);

		this.biomes.set("single", Biome.createForSingleFile(this, parentFolderURI));
	}

	/**
	 * Starts Biome instances for all workspace folders
	 */
	private async createWorkspaceInstances(): Promise<void> {
		const folders = workspace.workspaceFolders ?? [];

		this.logger.info(`🔍 Found ${folders.length} workspace folder(s).`);

		// Create the Biome instances for each workspace folder
		for (const folder of folders) {
			this.biomes.set(folder, Biome.createForWorkspaceFolder(this, folder));
		}
	}

	/**
	 * Registers a listener for the on-demand global instance
	 *
	 * This method registers a listener responsible for creating and starting a
	 * global Biome instance when the user opens a file that does not belong to
	 * any workspace folder.
	 *
	 * This allows users to format Untitled files, or their VS Code settings
	 * using Biome.
	 *
	 * Once the global instance is created, it will be kept alive until the
	 * extension is stopped to avoid creating and destroying the global instance
	 * every time the user opens/closes such a file.
	 */
	private async createGlobalInstance(): Promise<void> {
		const createGlobalInstanceIfNotExists = async () => {
			if (!this.biomes.get("global")) {
				const biome = Biome.createGlobalInstance(this);
				biome.start();

				this.biomes.set("global", biome);
			}
		};

		const createGlobalInstanceIfNeeded = async (
			editor?: TextEditor | undefined,
		) => {
			this.logger.debug(editor?.document?.uri.toString());

			if (!editor || !config("enabled", { default: true })) {
				return;
			}

			if (
				["untitled", "vscode-userdata"].includes(editor?.document.uri.scheme)
			) {
				// If the language of the document is already known, we check if it's
				// supported and create the global instance if it is. This is usually
				// the case for settings files, which already exist on disk and have
				// a languageId.
				if (supportedLanguages.includes(editor?.document.languageId)) {
					await createGlobalInstanceIfNotExists();
					return;
				}

				// Otherwise, we listen for changes to the document to check if the
				// languageId changes to a supported one. This is usually the case for
				// Untitled files, which don't have a languageId until the user
				// sets on manually, or types enough characters for VS Code to guess it.
				const listener = workspace.onDidChangeTextDocument(async (event) => {
					if (supportedLanguages.includes(event.document.languageId)) {
						await createGlobalInstanceIfNotExists();

						// Dispose the listener because we won't be coming back to
						// this state again. The global session will be kept alive
						// until the extension is stopped.
						listener.dispose();
						return;
					}
				});
			}
		};

		// Create a global instance if needed
		await createGlobalInstanceIfNeeded(window.activeTextEditor);

		// Register the listener for when the active text editor changes
		window.onDidChangeActiveTextEditor(
			debounce(async (editor?: TextEditor) => {
				await createGlobalInstanceIfNeeded(editor);
			}, 10),
		);
	}

	/**
	 * Starts the Biome instances
	 */
	private async startInstances(): Promise<void> {
		for (const [_folder, biome] of this.biomes) {
			await biome.start();
		}

		this.logger.info(`🚀 Started ${this.biomes.size} Biome instance(s).`);
	}

	/**
	 * Trust biomejs.dev domain for JSON schema downloads
	 *
	 * This function contributes to the json.schemaDownload.trustedDomains setting
	 * by adding "https://biomejs.dev" to the list of trusted domains. This allows
	 * users to load Biome JSON schemas without having to manually add the domain
	 * to their trusted domains list.
	 *
	 * The extension will only attempt to trust the biomejs.dev domain once, and
	 * will store a flag in the global state to avoid attempting to trust the
	 * domain multiple times. If the user untrusts the domain manually, we will
	 * not attempt to trust it again, and the user will have to manually re-trust
	 * the domain to load Biome JSON schemas again.
	 */
	private async trustBiomeDomain(): Promise<void> {
		// If we've already attempted to trust the domain, don't do it again
		if (this.context.globalState.get("alreadyTrustedBiomeDomain")) {
			return;
		}

		// Get the current list of trusted domains from the configuration
		const currentlyTrustedDomains = workspace
			.getConfiguration("json.schemaDownload")
			.get<Record<string, boolean>>("trustedDomains", {});

		const newlyTrustedDomains = {
			...currentlyTrustedDomains,
			"https://biomejs.dev": true,
		};

		// Update the trusted domains in the configuration
		await workspace
			.getConfiguration("json.schemaDownload")
			.update(
				"trustedDomains",
				newlyTrustedDomains,
				ConfigurationTarget.Global,
			);

		await this.context.globalState.update("alreadyTrustedBiomeDomain", true);

		this.logger.info(
			"🔐 Trusted biomejs.dev domain for JSON schema downloads.",
		);
	}
}
