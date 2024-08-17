import type { ExtensionContext } from "vscode";
import { createExtension, destroyExtension } from "./extension";
import { state } from "./state";

/**
 * Activates the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	state.context = context;
	await createExtension();
};

/**
 * Deactivates the Biome extension
 */
export const deactivate = async () => {
	await destroyExtension();
};
