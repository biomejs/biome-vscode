import { downloadBiome } from "./downloader";
import { restart, start, stop } from "./lifecycle";
import { clearTemporaryBinaries } from "./session";
import { state } from "./state";

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

export const clearCommand = async () => {
	await clearTemporaryBinaries();
	state.context.globalState.update("downloadedVersion", undefined);
};
