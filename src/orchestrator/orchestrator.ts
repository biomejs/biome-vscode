import type { WorkspaceMonitor } from "../workspace/monitor";

/**
 * Orchestrator
 *
 * The orchestrator is responsible for managing the lifecycle of Biome LSP
 * instances as the user navigates through VS Code's interface, changes
 * configuration options, or updates the `biome` binary.
 */
export class Orchestrator {
	/**
	 * Workspace Monitor
	 *
	 * The workspace monitor tracks changes to the structure of the workspace
	 * and notifies the orchestrator when a new Biome LSP instance should be
	 * started or an existing one should be stopped.
	 */
	private workspaceMonitor: WorkspaceMonitor;
}
