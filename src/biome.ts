import type { ExtensionContext } from "vscode";
import { SessionManager } from "./session/manager";
import { WorkspaceMonitor } from "./workspace/monitor";

export class Biome {
	public readonly sessionManager: SessionManager;
	public readonly workspaceMonitor: WorkspaceMonitor;

	/**
	 * Initializes the Biome extension
	 *
	 * @param context Extension context, as provided by VS Code's extension host.
	 */
	constructor(public readonly context: ExtensionContext) {
		this.workspaceMonitor = new WorkspaceMonitor();
		this.sessionManager = new SessionManager(this);
	}

	/**
	 * Initializes the Biome extension
	 */
	public async init() {
		await this.workspaceMonitor.init();
		await this.sessionManager.init();
	}
}
