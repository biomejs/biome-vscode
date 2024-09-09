import type { ExtensionContext } from "vscode";
import { createExtension, destroyExtension } from "./extension";
import { clear, info } from "./logger";
import { state } from "./state";

/**
 * Activates the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	clear();
	info(`Biome extension ${context.extension.packageJSON.version} activated`);
	state.context = context;
	await createExtension();
};

/**
 * Deactivates the Biome extension
 */
export const deactivate = async () => {
	await destroyExtension();
};
