import type { ExtensionContext } from "vscode";
import { Extension } from "./extension";
import { state } from "./state";
import { logger } from "./utils";

/**
 * Entry point of the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	logger.info(`Activating Biome extension in [${state.context}] mode.`);
	await new Extension(context).init();
};
