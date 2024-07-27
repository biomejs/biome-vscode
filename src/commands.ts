import { restart, start, stop } from "./extension";

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
