import type { ExtensionContext } from "vscode";
import { Orchestrator } from "./orchestrator";
import { StatusBar } from "./ui/status-bar/status-bar";
import { logger } from "./utils";

/**
 * Biome Extension for Visual Studio Code
 */
export class Extension {
	/**
	 * The Biome LSP session orchestrator.
	 */
	public orchestrator: Orchestrator = new Orchestrator();

	/**
	 * The extension's status bar.
	 */
	public statusBar: StatusBar = new StatusBar(this);

	/**
	 * Initializes the Biome extension
	 *
	 * @param context Extension context, as provided by VS Code.
	 */
	constructor(public readonly context: ExtensionContext) {}

	/**
	 * Initializes the Biome extension
	 */
	public async init() {
		await this.statusBar.init();
		await this.orchestrator.init();
	}
}
