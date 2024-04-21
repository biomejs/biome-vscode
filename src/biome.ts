import type { ExtensionContext } from "vscode";
import { WorkspaceMonitor } from "./workspace";

export class Biome {
	public readonly workspaceMonitor: WorkspaceMonitor;

	/**
	 * Initializes the Biome extension
	 *
	 * @param context Extension context, as provided by VS Code's extension host.
	 */
	constructor(public readonly context: ExtensionContext) {
		this.workspaceMonitor = new WorkspaceMonitor(this);
	}

	/**
	 * Initializes the Biome extension
	 */
	public async init() {
		await this.workspaceMonitor.init();
	}
}
