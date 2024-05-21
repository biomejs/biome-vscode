import { EventEmitter } from "node:events";
import { type WorkspaceFolder, workspace } from "vscode";
import type { Biome } from "../biome";
import { Locator } from "../locator";
import { logger } from "../logger";
import { config } from "../utils";
import { Session } from "./session";

export class SessionManager extends EventEmitter {
	/**
	 * Biome binary finder
	 */
	private finder: Locator = new Locator();

	/**
	 * Biome LSP sessions
	 */
	private _sessions: Map<WorkspaceFolder, Session> = new Map([]);

	/**
	 * Currently active Biome LSP session
	 */
	private _activeSession: string | undefined;

	/**
	 * Active session
	 */
	public get activeSession(): string | undefined {
		return this._activeSession;
	}

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
		const existingSession = this._sessions.get(folder);

		if (existingSession) {
			await this.destroySessionForWorkspaceFolder(folder);
		}

		const binaryPath = await this.finder.findForWorkspaceFolder(folder);

		if (!binaryPath) {
			logger.error(
				`Could not create an LSP session for workspace folder ${folder.uri.fsPath} because the Biome binary could not be found.`,
			);

			return;
		}

		const session = new Session(folder, binaryPath);

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
	 * Destroys the LSP session for a given workspace folder.
	 *
	 * This method destroys the LSP session for a given workspace folder. If no
	 * session exists for the workspace folder, this method does nothing.
	 *
	 * @param folder The workspace folder for which to destroy the session
	 */
	private async destroySessionForWorkspaceFolder(folder: WorkspaceFolder) {
		const existingSession = this._sessions.get(folder);

		if (!existingSession) {
			logger.debug(
				`Could not destroy LSP session for workspace folder ${folder.uri.fsPath} because it does not exist.`,
			);
		}

		await existingSession.destroy();
	}

	/**
	 * Destroys all the LSP sessions.
	 */
	private async destroyAllSessions() {
		for (const [folder, session] of this._sessions.entries()) {
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

		const existing = new Set(this._sessions.keys());

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
