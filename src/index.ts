import type { ExtensionContext } from "vscode";
import { createExtension, destroyExtension } from "./extension";
import { info } from "./logger";
import { state } from "./state";

/**
 * Activates the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	info("Biome extension activated");
	state.context = context;
	await createExtension();
};

/**
 * Deactivates the Biome extension
 */
export const deactivate = async () => {
	await destroyExtension();
};
