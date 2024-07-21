import {
	ProgressLocation,
	type TextEditor,
	Uri,
	type WorkspaceFolder,
	window,
	workspace,
} from "vscode";
import { Utils } from "vscode-uri";
import { Root } from "./root";
import { Session } from "./session";
import { state } from "./state";
import { config, fileExists, logger } from "./utils";

type RootDefinition = {
	uri: Uri;
	configFile?: Uri;
	workspaceFolder?: WorkspaceFolder;
};

export class Orchestrator {
	/**
	 * Global Biome LSP session
	 *
	 * The global Biome session is used to provide LSP features to files that
	 * do not yet exist on disk, and thus do not have an associated root, or
	 * configuration file.
	 *
	 * This session is created on-demand when a so-called "untitled" file is
	 * opened.
	 */
	private globalSession: Session | undefined;

	/**
	 * The Biome roots currently being tracked by the orchestrator.
	 */
	private roots: Root[] = [];

	/**
	 * Initializes the orchestrator.
	 */
	async init() {
		logger.debug("Initializing Biome LSP orchestrator.");

		workspace.onDidChangeConfiguration(async (event) => {
			if (event.affectsConfiguration("biome")) {
				logger.info("Biome configuration changed. Restarting...");
				window.withProgress(
					{
						title: "Configuration changed. Restarting Biome extension...",
						cancellable: false,
						location: ProgressLocation.Notification,
					},
					async () => await this.restart(),
				);
			}
		});

		// If the extension is disabled, do not start the orchestrator
		if (!config("enabled", { default: true })) {
			return;
		}

		// Start the orchestrator
		await this.start();

		// Listen for the opening of untitled files to create a global session
		if (window.activeTextEditor?.document.uri.scheme === "untitled") {
			this.manageGlobalSessionLifecycle(window.activeTextEditor);
		}
		window.onDidChangeActiveTextEditor(async (editor) =>
			this.manageGlobalSessionLifecycle(editor),
		);

		logger.debug("Biome LSP orchestrator initialized.");
	}

	/**
	 * Starts the orchestrator.
	 *
	 * This method starts the orchestrator and creates a new session for each
	 * Biome root found in each workspace folder.
	 */
	async start() {
		state.state = "starting";

		logger.debug("Detecting Biome roots.");
		const detectedRoots = await this.detectBiomeRoots();

		logger.debug(
			`Detected ${detectedRoots.length} Biome roots:`,
			detectedRoots.map((root) => root.uri.fsPath),
		);

		// Create a new Root instance for each detected root
		for (const rootDefinition of detectedRoots) {
			this.roots.push(
				new Root({
					uri: rootDefinition.uri,
					workspaceFolder: rootDefinition.workspaceFolder,
					configFile: rootDefinition.configFile,
				}),
			);
		}

		if (this.roots.length === 0) {
			state.state = "disabled";
			return;
		}

		// Initialize all roots
		logger.debug("Initializing Biome roots.");
		for (const root of this.roots) {
			await root.init();
		}

		state.state = "started";
	}

	/**
	 * Stops the orchestrator.
	 *
	 * This method stops the orchestrator and destroys all the sessions.
	 */
	async stop() {
		state.state = "stopping";

		// Stop all roots
		for (const root of this.roots) {
			await root.destroy();
		}

		this.roots = [];

		state.state = "stopped";
	}

	/**
	 * Restarts the orchestrator.
	 *
	 * This method restarts the orchestrator, destroying all sessions and then
	 * recreating them.
	 */
	async restart() {
		await this.stop();
		await this.start();
	}

	/**
	 * Detects Biome roots
	 *
	 * This method will detect all the Biome roots in the workspace.
	 */
	public async detectBiomeRoots(): Promise<
		{ uri: Uri; configFile?: Uri; workspaceFolder?: WorkspaceFolder }[]
	> {
		// If we operate in a single-file context, we create a single root whose
		// URI is the parent directory of the file.
		if (state.context === "single-file") {
			const uri = window.activeTextEditor?.document.uri;
			return uri
				? [
						{
							uri: Utils.resolvePath(uri, ".."),
							// configFile: config("configFile", { scope: uri }),
						},
					]
				: [];
		}

		// If we operate in a workspace context, we loop over all workspace folders
		// and check if they have explicitly declared roots in their configuration.
		// If they have, we use those, otherwise we use the workspace folder itself
		// as a the root.
		const allRoots: RootDefinition[] = [];
		for (const folder of workspace.workspaceFolders || []) {
			const rootsFromConfig = config<
				{
					uri: string;
					configFile?: string;
				}[]
			>("roots", { scope: folder.uri });

			const roots: RootDefinition[] = [];

			// If no roots are defined, we create a root using
			// the workspace folder
			if (rootsFromConfig.length === 0) {
				logger.debug(
					`No roots defined for workspace folder ${folder.uri.fsPath}.`,
				);
				roots.push({
					uri: folder.uri,
					workspaceFolder: folder,
				});
			}

			allRoots.push(...roots);
		}

		const configFileExistsIfRequired = async (root: RootDefinition) => {
			const requireConfig = config("requireConfig", {
				default: false,
				scope: root.workspaceFolder.uri,
			});

			// Check if any of the accepted configuration files exist
			// in the order they are defined in the array.
			const acceptedConfigFiles = [
				...(root.configFile ? [root.configFile] : []),
				Uri.joinPath(root.uri, "biome.json"),
				Uri.joinPath(root.uri, "biome.jsonc"),
			];

			let configFileExists = false;
			for (const configFile of acceptedConfigFiles) {
				if (await fileExists(configFile)) {
					configFileExists = true;
					break;
				}
			}

			return !requireConfig || configFileExists;
		};

		// If a Biome configuration file is required, filter out roots
		// that do not have a configuration file.
		const hasConfigFileIfRequired = await Promise.all(
			allRoots.map(configFileExistsIfRequired),
		);

		return allRoots.filter(
			(value, index) => hasConfigFileIfRequired[index],
		);
	}

	private async manageGlobalSessionLifecycle(editor?: TextEditor) {
		if (!editor) return;

		const uri = editor.document.uri;
		if (uri.scheme === "untitled") {
			await this.startGlobalSession();
		} else {
			await this.stopGlobalSession();
		}
	}

	private async startGlobalSession() {
		if (this.globalSession) return;
		this.globalSession = new Session();
		await this.globalSession.start();
	}

	private async stopGlobalSession() {
		if (!this.globalSession) return;
		await this.globalSession.destroy();
		this.globalSession = undefined;
	}
}
