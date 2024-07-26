import type { ExtensionContext } from "vscode";
import { type Extension, createExtension } from "./extension";

let cleanup: Extension;

/**
 * Entry point of the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	cleanup = await createExtension();
};
