import { EventEmitter } from "node:events";
import { type WorkspaceFolder, window, workspace } from "vscode";
import type { Biome } from "./biome";
import { logger } from "./logger";

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
	private _monitoredFolders: WorkspaceFolder[] = [];

	/**
	 * Instantiates a new workspace monitor
	 *
	 * @param biome The instance of the Biome extension
	 */
	constructor(private readonly biome: Biome) {
		super();
	}

	/**
	 * Initializes the workspace monitor
	 */
	public async init() {
		await this.discoverWorkspaceFolders();
		await this.discoverActiveWorkspaceFolder();
		this.registerListeners();
	}

	/**
	 * Discovers the active workspace folder
	 *
	 * This method will discover the active workspace folder, and emit a
	 * `activeWorkspaceFolderChanged` event if the active workspace folder has
	 * changed. If the active workspace folder cannot be determined, this method
	 * will do nothing.
	 */
	private async discoverActiveWorkspaceFolder() {
		const folder = window.activeTextEditor?.document.uri
			? workspace.getWorkspaceFolder(window.activeTextEditor.document.uri)
			: undefined;

		// Because we end up here whenever the active text editor changes, we need
		// to check if the active folder has actually changed before emitting an
		// event. This is because the active text editor might change to a different
		// file in the same workspace folder, which doesn't require an event.
		if (folder === this._activeFolder) {
			logger.debug(
				`Active text editor changed, but workspace folder is the same: ${folder?.uri.fsPath}`,
			);
			return;
		}

		// Before emitting an event, we make sure that the active workspace folder
		// is actually one of the monitored folders. This is because the active
		// workspace folder might be in a workspace that was removed, or it might
		// be in a workspace in which Biome is not active.
		if (!this._monitoredFolders.includes(folder)) {
			logger.debug(
				`Active workspace folder is not monitored: ${folder?.uri.fsPath}`,
			);
			return;
		}

		const previous = this._activeFolder;
		this._activeFolder = folder;
		logger.debug(
			`Active workspace folder changed from ${previous?.uri.fsPath} to ${folder?.uri.fsPath}`,
		);
		this.emit("activeWorkspaceFolderChanged", folder);
	}

	/**
	 * Discovers workspace folders
	 *
	 * This method will discover new workspace folders, detect the ones that have
	 * been removed, and emit a `workspaceFoldersChanged` event with the list of
	 * added and removed workspace folders.
	 */
	private async discoverWorkspaceFolders() {
		const previous = this._monitoredFolders;
		const current = await this.getWorkspaceFolders();

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
	 * Retrieves the list of workspace folders
	 *
	 * This method will retrieve the list of workspace folders from the VS Code
	 * workspace API. If no workspace folders are available, an empty array will
	 * be returned.
	 */
	private async getWorkspaceFolders(): Promise<WorkspaceFolder[]> {
		return [...(workspace.workspaceFolders ?? [])];
	}

	private registerListeners() {
		this.biome.context.subscriptions.push(
			workspace.onDidChangeWorkspaceFolders(() =>
				this.discoverWorkspaceFolders(),
			),
			window.onDidChangeActiveTextEditor(() =>
				this.discoverActiveWorkspaceFolder(),
			),
		);
	}
}
