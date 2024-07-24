import type { ExtensionContext } from "vscode";
import { Extension } from "./extension";

let extension: Extension;

/**
 * Entry point of the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	extension = new Extension(context);
	await extension.init();
};
