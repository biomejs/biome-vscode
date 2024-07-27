import type { ExtensionContext } from "vscode";
import { createExtension, destroyExtension } from "./extension";

/**
 * Activates the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	await createExtension(context);
};

/**
 * Deactivates the Biome extension
 */
export const deactivate = async () => {
	await destroyExtension();
};
