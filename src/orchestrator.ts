import { workspace } from "vscode";
import type { Root } from "./root";
import type { Session } from "./session";
import { WorkspaceMonitor } from "./workspace/monitor";

export class Orchestrator {
	/**
	 * Context
	 *
	 * The context in which the orchestrator is running.
	 */
	private context: "workspace" | "single-file";

	/**
	 * The LSP sessions
	 *
	 * A map of Biome roots to their respective LSP sessions. In a single-file
	 * context, there will only be one session, and the root will be the URI of
	 * the file's parent directory.
	 */
	private sessions: Map<Root, Session> = new Map([]);

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

		// If VS code is running in a workspace context, initialize the
		// workspace monitor.
		if (this.context === "workspace") {
			this.workspaceMonitor = new WorkspaceMonitor();
			this.workspaceMonitor?.init();
		}

		this.start();
	}

	async start() {}

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
