import type { ExtensionContext } from "vscode";
import Extension from "./extension";
import { activate as activateTokenProvider } from "./gritql-token-provider";

let extension: Extension | undefined;

/**
 * Activates the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	extension = Extension.create(context);
	await extension.init();
	activateTokenProvider(context);
};

/**
 * Deactivates the Biome extension
 */
export const deactivate = async () => {
	await extension?.stop();
};
