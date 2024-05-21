import { EventEmitter } from "node:events";
import { type WorkspaceFolder, window, workspace } from "vscode";
import { logger } from "../logger";

/**
 * Workspace Monitor
 *
 * The workspace monitor is responsible for keeping track of workspace folders
 * so that other parts of the extension can can react to workspace folders being
 * added or removed from the workspace.
 *
 * It also keeps track of the currently active workspace folder, which is the
 * folder to which the file in the active editor belongs.
 *
 * Upon initialization, the workspace monitor will perform an initial scan of
 * the workspace folders and emit the appropriate events, after which it will
 * register listeners for workspace folder changes, and emit events as needed.
 */
export class WorkspaceMonitor extends EventEmitter {
	/**
	 * Active workspace folder
	 *
	 * This property contains the workspace folder that is currently active, i.e.
	 * the folder to which the file in the active editor belongs. If the active
	 * editor is not associated with a workspace folder, or if no editor is open,
	 * this property will be undefined.
	 */
	private _activeFolder: WorkspaceFolder | undefined;

	/**
	 * Monitored workspace folders
	 *
	 * This property contains the list of workspace folders that are currently
	 * being monitored by the workspace monitor.
	 */
	private _monitoredFolders: readonly WorkspaceFolder[] = [];

	/**
	 * Workspace folders in which Biome is active
	 */
	public get workspaceFolders(): readonly WorkspaceFolder[] {
		return this._monitoredFolders;
	}

	/**
	 * Initializes the workspace monitor
	 */
	public async init() {
		await this.detectWorkspaceFolders();
		workspace.onDidChangeWorkspaceFolders(() => this.detectWorkspaceFolders());

		await this.detectActiveWorkspaceFolder();
		window.onDidChangeActiveTextEditor(() =>
			this.detectActiveWorkspaceFolder(),
		);
	}

	/**
	 * Detects the workspace folders
	 */
	private async detectWorkspaceFolders() {
		const previous = this._monitoredFolders;
		const current = workspace.workspaceFolders ?? [];

		const added = current.filter((folder) => !previous.includes(folder));
		logger.debug(
			`Added workspace folders: ${added
				.map((folder) => folder.uri.fsPath)
				.join(", ")}`,
		);

		const removed = previous.filter((folder) => !current.includes(folder));
		logger.debug(
			`Removed workspace folders: ${removed
				.map((folder) => folder.uri.fsPath)
				.join(", ")}`,
		);

		this._monitoredFolders = current;
		this.emit("workspaceFoldersChanged", { added, removed });
	}

	/**
	 * Detects the active workspace folder
	 */
	private async detectActiveWorkspaceFolder(): Promise<void> {
		const folder = window.activeTextEditor?.document.uri
			? workspace.getWorkspaceFolder(window.activeTextEditor.document.uri)
			: undefined;

		// If the active editor is not associated with a workspace folder, we don't
		// need to do anything.
		if (!folder) {
			return;
		}

		// If both the previous and the current active workspace folders are
		// identical, we don't need to do anything.
		if (folder === this._activeFolder) {
			return;
		}

		// If the active workspace folder is not being monitored, we don't need to
		// do anything.
		if (!this._monitoredFolders.includes(folder)) {
			return;
		}

		const previous = this._activeFolder;

		this._activeFolder = folder;

		logger.debug(
			`Active workspace folder changed from [${previous?.name}] to [${folder?.name}]`,
		);

		this.emit("activeWorkspaceFolderChanged", folder);
	}
}
