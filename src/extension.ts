import type { ExtensionContext } from "vscode";
import { Orchestrator } from "./orchestrator";

/**
 * Biome Extension for Visual Studio Code
 */
export class Extension {
	/**
	 * The Biome LSP session orchestrator.
	 */
	public orchestrator: Orchestrator = new Orchestrator();

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
		await this.orchestrator.init();
	}
}
