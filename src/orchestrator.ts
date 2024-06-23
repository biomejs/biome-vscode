import { workspace } from "vscode";
import { WorkspaceMonitor } from "./workspace/monitor";

export class Orchestrator {
	/**
	 * Context
	 *
	 * The context in which the orchestrator is running.
	 */
	private context: "workspace" | "single-file";

	/**
	 * Workspace Monitor
	 *
	 * The workspace monitor, if the orchestrator is running in a workspace context.
	 */
	private workspaceMonitor?: WorkspaceMonitor;

	/**
	 * Initializes the orchestrator.
	 */
	async init() {
		this.context = this.determineContext();
		this.start();
	}

	async start() {
		if (this.context === "workspace") {
			this.workspaceMonitor = new WorkspaceMonitor();
			this.workspaceMonitor.init();
		}
	}

	/**
	 * Determines the context in which the orchestrator is running.
	 */
	private determineContext(): "workspace" | "single-file" {
		if (workspace.workspaceFolders === undefined) {
			return "single-file";
		}

		return "workspace";
	}
}
