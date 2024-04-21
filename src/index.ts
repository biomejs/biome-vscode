import type { ExtensionContext } from "vscode";
import { Biome } from "./biome";
import { logger } from "./logger";

/**
 * Entry point of the Biome extension
 */
export const activate = async (context: ExtensionContext) => {
	logger.info("Activating Biome extension");
	await new Biome(context).init();
};
