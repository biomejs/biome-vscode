import { EventEmitter } from "node:events";
import { RelativePattern, Uri, type WorkspaceFolder, workspace } from "vscode";
import type { Biome } from "../extension";
import { findBiomeLocally } from "../locator/locator";
import { logger } from "../logger";
import { Session } from "../session";
import { config } from "../utils";

export class SessionManager extends EventEmitter {
	/**
	 * Global Biome LSP session
	 *
	 * The global Biome LSP session is used when the extension is loaded in a
	 * single-file context, i.e. when there are no workspace folders. In a
	 * workspace context, the global session is undefined, and each workspace
	 * folder has its own session.
	 */
	private globalSession: Session | undefined;

	/**
	 * Workspace Biome LSP sessions
	 *
	 * This map contains the Biome LSP sessions for each workspace folder. The
	 * key is the workspace folder, and the value is the session. In a single-file
	 * context, this map is empty.
	 */
	private workspaceSessions: Map<WorkspaceFolder, Session> = new Map([]);

	/**
	 * Instantiates a new session manager
	 *
	 * @param biome The instance of the Biome extension
	 */
	constructor(private readonly biome: Biome) {
		super();
	}

	/**
	 * Initializes the session manager
	 */
	public async init() {
		logger.debug("Initializing session manager");

		// If we're in a single-file context, we create a global LSP session
		if (workspace.workspaceFolders === undefined) {
			await this.createGlobalSession();
			return;
		}

		await this.synchronize(this.biome.workspaceMonitor.workspaceFolders);

		// Whenever the workspace folders change, we synchronize the LSP sessions
		this.biome.workspaceMonitor.on("foldersChanged", async (folders) => {
			await this.synchronize(folders);
		});
	}

	/**
	 * Creates a new LSP session for a given workspace folder.
	 *
	 * This method creates a new LSP session for a given workspace folder. If a
	 * session already exists for the workspace folder, it is destroyed before
	 * creating a new one.
	 *
	 * @param workspaceFolder The workspace folder for which to create the session
	 */
	private async createSessionForWorkspaceFolder(folder: WorkspaceFolder) {
		const existingSession = this.workspaceSessions.get(folder);

		if (existingSession) {
			await this.destroySessionForWorkspaceFolder(folder);
		}

		const biome = await findBiomeLocally(folder.uri);

		if (!biome) {
			logger.error(
				`Could not create an LSP session for workspace folder ${folder.uri.fsPath} because the Biome binary could not be found.`,
			);

			return;
		}

		const session = new Session(biome.uri, folder);

		// If Biome was found in node_modules, we listen for changes to the root
		// @biomejs/biome package and recreate the session if it changes. This allows
		// us to gracefully handle Biome being updated with a package manager.
		if (biome.source === "node modules") {
			const packageJsonPath = require.resolve(
				"@biomejs/biome/package.json",
				{
					paths: [folder.uri.fsPath],
				},
			);

			const watcher = workspace.createFileSystemWatcher(
				new RelativePattern(Uri.file(packageJsonPath), "*"),
			);

			watcher.onDidChange(async () => {
				logger.info(
					`Biome binary for workspace folder ${folder.uri.fsPath} has changed. Restarting session.`,
				);

				await this.createSessionForWorkspaceFolder(folder);
				watcher.dispose();
			});
		}

		session.addListener("stateChanged", (state) =>
			this.emit("sessionStateChanged", folder, state),
		);

		// Whenever the configuration scoped to the workspace folder changes,
		// we recreate the LSP session.
		workspace.onDidChangeConfiguration(async (event) => {
			if (event.affectsConfiguration("biome", folder)) {
				await this.createSessionForWorkspaceFolder(folder);
			}
		});

		session.start();
	}

	/**
	 * Creates a new global LSP session.
	 */
	private async createGlobalSession() {
		if (this.globalSession) {
			await this.destroyGlobalSession();
		}

		const binaryPath = await this.finder.findGlobally();

		if (!binaryPath) {
			logger.error(
				"Could not create a global LSP session because the Biome binary could not be found.",
			);

			return;
		}

		const session = new Session(binaryPath);

		session.start();
	}

	/**
	 * Destroys the LSP session for a given workspace folder.
	 *
	 * This method destroys the LSP session for a given workspace folder. If no
	 * session exists for the workspace folder, this method does nothing.
	 *
	 * @param folder The workspace folder for which to destroy the session
	 */
	private async destroySessionForWorkspaceFolder(folder: WorkspaceFolder) {
		const existingSession = this.workspaceSessions.get(folder);

		if (!existingSession) {
			logger.debug(
				`Could not destroy LSP session for workspace folder ${folder.uri.fsPath} because it does not exist.`,
			);
		}

		await existingSession.destroy();
	}

	/**
	 * Destroys the global LSP session
	 */
	private async destroyGlobalSession() {
		if (!this.globalSession) {
			logger.debug(
				"Could not destroy global LSP session because it does not exist.",
			);
		}

		await this.globalSession.destroy();
	}

	/**
	 * Destroys all the LSP sessions.
	 */
	private async destroyAllSessions() {
		await this.destroyGlobalSession();
		for (const [folder] of this.workspaceSessions.entries()) {
			await this.destroySessionForWorkspaceFolder(folder);
		}
	}

	/**
	 * Synchronizes the LSP sessions with the workspace folders.
	 *
	 * This method creates new LSP sessions for any workspace folders that do not
	 * have a session yet. It also destroys any sessions that are no longer needed
	 * because the workspace folder has been removed.
	 */
	private async synchronize(
		folders: readonly WorkspaceFolder[],
	): Promise<void> {
		// If the extension becomes disabled, we destroy all the LSP sessions.
		if (!config("enabled", { default: true })) {
			return await this.destroyAllSessions();
		}

		const existing = new Set(this.workspaceSessions.keys());

		// Start a new session for every new workspace folder
		for (const folder of folders) {
			if (!existing.has(folder)) {
				await this.createSessionForWorkspaceFolder(folder);
				logger.info(
					`Started LSP session for workspace folder: ${folder.uri.fsPath}.`,
				);
			}
		}

		const current = new Set(folders);

		/**
		 * Destroy the session for each removed workspace folder
		 */
		for (const folder of existing) {
			if (!current.has(folder)) {
				this.destroySessionForWorkspaceFolder(folder);
				logger.info(
					`Destroyed LSP session for workspace folder: ${folder.uri.fsPath}.`,
				);
			}
		}
	}
}
