import { restart, start, stop } from "../extension";

/**
 * Starts the Biome extension
 */
export const startCommand = async () => {
	await start();
};

/**
 * Stops the Biome extension
 */
export const stopCommand = async () => {
	await stop();
};

/**
 * Restarts the Biome extension
 */
export const restartCommand = async () => {
	await restart();
};
