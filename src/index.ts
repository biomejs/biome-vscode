import { createExtension, destroyExtension } from "./extension";

/**
 * Activates the Biome extension
 */
export const activate = async () => {
	await createExtension();
};

/**
 * Deactivates the Biome extension
 */
export const deactivate = async () => {
	await destroyExtension();
};
