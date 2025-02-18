import { downloadBiome } from "./downloader";
import { restart, start, stop } from "./lifecycle";
import { info } from "./logger";
import type { Project } from "./project";
import type { Session } from "./session";
import { state } from "./state";
import { clearTemporaryBinaries } from "./utils";

/**
 * Starts the Biome extension
 *
 * This command is exposed to the users as a command in the command palette.
 */
export const startCommand = async () => {
	await start();
};

/**
 * Stops the Biome extension
 *
 * This command is exposed to the users as a command in the command palette.
 */
export const stopCommand = async () => {
	await stop();
};

/**
 * Restarts the Biome extension
 *
 * This command is exposed to the users as a command in the command palette.
 */
export const restartCommand = async () => {
	await restart();
};

/**
 * Installs a pre-built version of the Biome CLI
 *
 * This command is exposed to the users as a command in the command palette.
 *
 * When calling this command, the user will be prompted to select a version of
 * the Biome CLI to install. The selected version will be downloaded and stored
 * in VS Code's global storage directory.
 */
export const downloadCommand = async () => {
	await downloadBiome();
};

/**
 * Resets the Biome extension
 *
 * This command is exposed to the users as a command in the command palette.
 *
 * When calling this command, the extension will be stopped, all temporary
 * binaries will be removed, and the downloaded version of the Biome CLI will
 * be cleared from VS Code's global storage directory.
 */
export const resetCommand = async () => {
	await stop();
	await clearTemporaryBinaries();
	await state.context.globalState.update("downloadedVersion", undefined);
	info("Biome extension was reset");
	await start();
};

export const getAllProjects = (): Map<Project, Session> => {
	return state.sessions;
};
