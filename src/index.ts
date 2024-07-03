import type { ExtensionContext } from "vscode";
import { Extension } from "./extension";
import { logger } from "./logger";

/**
 * Entry point of the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	logger.info("Activating Biome extension");
	await new Extension(context).init();
};
