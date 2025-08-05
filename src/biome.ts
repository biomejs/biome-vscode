import { chmodSync, copyFileSync } from "node:fs";
import {
	type Disposable,
	type FileSystemWatcher,
	RelativePattern,
	Uri,
	type WorkspaceFolder,
	workspace,
} from "vscode";
import { platformSpecificBinaryName } from "./constants";
import type Extension from "./extension";
import Locator from "./locator";
import Logger from "./logger";
import Session from "./session";
import type { State } from "./types";
import { config, debounce } from "./utils";

export default class Biome {
	/**
	 * Logger for this Biome instance
	 */
	public readonly logger: Logger;

	/**
	 * State of the Biome instance
	 */
	private _state: State = "starting";

	/**
	 * LSP session for this Biome instance.
	 */
	private _session: Session | undefined;

	/**
	 * The lockfile watcher for this Biome instance.
	 */
	private _lockfileWatcher: FileSystemWatcher | undefined;

	/**
	 * The configuration watcher for this Biome instance.
	 */
	private _configWatcher: Disposable | undefined;

	/**
	 * The locator responsible for finding the Biome binary to use.
	 */
	private readonly locator: Locator;

	/**
	 * LSP session for this Biome instance.
	 */
	public get session(): Session | undefined {
		return this._session;
	}

	/**
	 * Current state of the Biome instance
	 */
	public get state() {
		return this._state;
	}

	/**
	 * Sets the state of the Biome instance
	 *
	 * This setter will also trigger state change callbacks.
	 */
	public set state(value: State) {
		this._state = value;
		for (const callback of this.stateChangeCallbacks) {
			callback(value);
		}
	}

	/**
	 * The state change callbacks
	 */
	private stateChangeCallbacks: ((state: State) => void | Promise<void>)[] = [];

	/**
	 * Indicates whether Biome is enabled for this workspace folder.
	 */
	public get enabled(): boolean {
		return (
			config("enabled", { scope: this.workspaceFolder, default: true }) ?? true
		);
	}

	/**
	 * The version of Biome currently in use.
	 */
	public get version(): string | undefined {
		return this._session?.biomeVersion;
	}

	/**
	 * Whether this Biome instance is global
	 */
	public get isGlobal(): boolean {
		return !this.workspaceFolder;
	}

	/**
	 * Name of this Biome instance
	 */
	public get name(): string {
		if (this.singleFileFolder) {
			return "single-file";
		}

		if (!this.workspaceFolder) {
			return "global";
		}

		return this.workspaceFolder?.name ?? "unknown";
	}

	/**
	 * The path to a temporary directory for this Biome instance
	 */
	private get tempDirectory(): Uri | undefined {
		if (!this.extension.context.storageUri || !this.workspaceFolder) {
			return undefined;
		}

		return Uri.joinPath(
			this.extension.context.storageUri,
			this.workspaceFolder.name,
		);
	}

	/**
	 * Creates a new Biome instance
	 *
	 * @param workspaceFolder The workspace folder for which to create the Biome instance.
	 */
	private constructor(
		public readonly extension: Extension,
		public readonly workspaceFolder?: WorkspaceFolder,
		public readonly singleFileFolder?: Uri,
	) {
		this.logger = new Logger(`Biome (${this.name})`);
		this.locator = new Locator(this);
	}

	/**
	 * Creates new Biome instance for a single file.
	 *
	 * This is used when the user opens a single file in VSCode, and we need to
	 * create a Biome instance for that file.
	 *
	 * @param extension The extension instance.
	 * @param parentFolderUri The URI of the parent folder of the file.
	 */
	public static createForSingleFile(
		extension: Extension,
		parentFolderUri: Uri,
	): Biome {
		return new Biome(extension, undefined, parentFolderUri);
	}

	/**
	 * Creates a new Biome instance for a workspace folder.
	 *
	 * @param extension The extension instance.
	 * @param workspaceFolder The workspace folder for which to create the Biome instance.
	 */
	public static createForWorkspaceFolder(
		extension: Extension,
		workspaceFolder: WorkspaceFolder,
	): Biome {
		return new Biome(extension, workspaceFolder);
	}

	/**
	 * Creates a new global Biome instance.
	 *
	 * @param extension The extension instance.
	 */
	public static createGlobalInstance(extension: Extension): Biome {
		return new Biome(extension, undefined, undefined);
	}

	/**
	 * Starts the Biome instance.
	 */
	public async start() {
		if (this._session && this.state !== "error") {
			return; // Avoid starting the same session multiple times.
		}

		this.listenForLockfilesChanges();
		this.listenForConfigChanges();

		if (!this.enabled) {
			this.logger.info("Biome is disabled.");
			this.state = "disabled";
			return;
		}

		this.state = "starting";
		const binary = await this.getBinary();

		if (!binary) {
			this.logger.error("Unable to find the Biome binary.");
			this.state = "error";
			return;
		}

		// Create the session
		// We pass all parameters, and the session will determine which one to use
		// based on the presence of the workspace folder and single file folder.
		this._session = new Session(
			this,
			binary,
			this.workspaceFolder,
			this.singleFileFolder,
		);

		try {
			await this._session?.start();
			this.logger.info("✅ Biome is ready.");
			this.state = "ready";
		} catch (_error) {
			this.state = "error";
			this.logger.error("Failed to start the session");
			await this.stop();
		}
	}

	/**
	 * Stops the Biome instance.
	 */
	public async stop() {
		// If we end up here following a configuration change, we need to wait
		// for the notification to be processed before we can stop the LSP session,
		// otherwise we will get an error. This is a workaround for a race condition
		// that occurs when the configuration change notification is sent while the
		// LSP session is already stopped.
		await new Promise((resolve) => setTimeout(resolve, 1000));

		await this._session?.stop();

		await this.cleanup();

		this._session = undefined;
	}

	/**
	 * Restarts the Biome instance.
	 */
	public async restart() {
		this.logger.info("🔄 Restarting Biome...");
		await this.stop();
		await this.start();
	}

	/**
	 * Retrieves the path to the Biome binary
	 *
	 * This method uses the locator to find the Biome binary on the system, and
	 * if necessary copies it to a temporary location from where it will be executed
	 * to prevent locking the original binary.
	 */
	protected async getBinary(): Promise<Uri | undefined> {
		const binary = this.isGlobal
			? await this.locator.findBiomeForGlobalInstance()
			: await this.locator.findBiomeForWorkspaceFolder();

		if (!binary) {
			return undefined;
		}

		return (await this.shouldRunFromTemporaryLocation())
			? await this.copyToTemporaryLocation(binary)
			: binary;
	}

	/**
	 * Determines whether the Biome binary should be ran from a temporary
	 * location.
	 *
	 * On most systems, the Biome binary can be executed directly. However, on
	 * Windows, the binary will be locked by the system when it is executed,
	 * preventing users to update it while the LSP session is running.
	 *
	 * To prevent this, the binary is copied to a temporary location and
	 * executed from there, allowing the original binary to be updated
	 * without affecting the running LSP session.
	 *
	 * There are however some cases where end users may want to run the
	 * original binary directly, for example when their system's policy
	 * prevents them from executing binaries from the temporary location,
	 * so we'll provide an escape hatch in the form of a configuration
	 * setting.
	 */
	protected async shouldRunFromTemporaryLocation(): Promise<boolean> {
		// Never copy the binary when creating a global instance, because we assume it's
		// installed globally and already in the right place.
		if (this.isGlobal) {
			this.logger.debug(
				"The binary should not be copied to a temporary location because this is a global instance.",
			);
			return false;
		}

		const runFromTemporaryLocation = config("runFromTemporaryLocation", {
			scope: this.workspaceFolder,
			default: process.platform === "win32",
		});

		return Boolean(runFromTemporaryLocation);
	}

	/**
	 * Copies the original Biome binary to a temporary location.
	 *
	 * This method copies the original binary to a temporary location and
	 * returns the URI to the copied binary. It also ensures that the copied
	 * binary is executable.
	 */
	protected async copyToTemporaryLocation(
		originalBinary: Uri,
	): Promise<Uri | undefined> {
		try {
			const tempDirectory = this.tempDirectory;

			this.logger.debug(
				`Temporary directory for Biome: ${tempDirectory?.fsPath}`,
			);

			if (!tempDirectory) {
				return;
			}

			await workspace.fs.createDirectory(tempDirectory);

			this.logger.debug(
				`Ensured temporary directory exists: ${tempDirectory.fsPath}`,
			);

			const destination = Uri.joinPath(
				tempDirectory,
				platformSpecificBinaryName,
			);

			this.logger.debug(
				`Will copy the original binary at ${originalBinary.fsPath} to ${destination.fsPath}`,
			);

			copyFileSync(originalBinary.fsPath, destination.fsPath);

			this.logger.debug(
				`Copied the original binary to a temporary location: ${destination.fsPath}`,
			);

			chmodSync(destination.fsPath, 0o755);

			return destination;
		} catch (_error) {
			await this.cleanup();
			return undefined;
		}
	}

	/**
	 * Listens for changes to common lockfiles in the workspace folder
	 *
	 * This method will register a listener for changes to common lockfiles in the
	 * workspace folder. This is useful for reloading the Biome instance when
	 * dependencies are updated.
	 */
	protected listenForLockfilesChanges() {
		// If we're a global instance, we don't have a workspace folder to watch
		// for changes, so we don't need to do anything.
		if (!this.workspaceFolder) {
			return;
		}

		if (this._lockfileWatcher) {
			return;
		}

		this._lockfileWatcher = workspace.createFileSystemWatcher(
			new RelativePattern(
				this.workspaceFolder,
				"{package-lock.json,yarn.lock,bun.lockb,bun.lock,pnpm-lock.yaml}",
			),
		);

		this._lockfileWatcher.onDidChange(
			debounce((event) => {
				this.logger.info(`🔒 Lockfile "${event.fsPath}" changed.`);
				this.restart();
			}),
		);

		this._lockfileWatcher.onDidCreate(
			debounce((event) => {
				this.logger.info(`🔒 Lockfile "${event.fsPath}" created.`);
				this.restart();
			}),
		);

		this._lockfileWatcher.onDidDelete(
			debounce((event) => {
				this.logger.info(`🔒 Lockfile "${event.fsPath}" deleted.`);
				this.restart();
			}),
		);

		this.logger.info("🔒 Started listening for lockfile changes.");

		// Register the watcher in the extension context's subscriptions
		// to ensure it is disposed of when the extension is deactivated.
		this.extension.context.subscriptions.push(this._lockfileWatcher);
	}

	protected listenForConfigChanges() {
		if (!this._configWatcher) {
			this._configWatcher = workspace.onDidChangeConfiguration(
				debounce(async (event) => {
					if (event.affectsConfiguration("biome", this.workspaceFolder)) {
						this.logger.info("⚙️ Configuration changed.");
						await this.restart();
					}
				}, 1000),
			);
		}
		this.logger.info("⚙️ Started listening for extension settings changes.");
		this.extension.context.subscriptions.push(this._configWatcher);
	}

	/**
	 * Cleans up the temporary directory.
	 */
	protected async cleanup(): Promise<void> {
		// Dispose of the config watcher
		this._configWatcher?.dispose();
		this._configWatcher = undefined;

		// Dispose of the lockfile watcher
		this._lockfileWatcher?.dispose();
		this._lockfileWatcher = undefined;

		// Nothing to cleanup if we're a global instance
		if (this.isGlobal) {
			return;
		}

		this.logger.debug("🧹 Cleaning up temporary directory.");

		if (!this.tempDirectory) {
			return;
		}

		await workspace.fs.delete(this.tempDirectory, {
			recursive: true,
			useTrash: false,
		});

		this.logger.debug("🧹 Temporary directory has been cleaned up.");
	}

	/**
	 * Registers a callback to be called when the state of the Biome instance changes.
	 */
	public onStateChange(callback: (state: State) => void | Promise<void>): void {
		this.stateChangeCallbacks.push(callback);
	}
}
