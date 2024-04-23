import { type ConfigurationScope, workspace } from "vscode";

/**
 * Retrieves a setting
 */
export const get = <T>(key: string, options?: GetOptions<T>): T | undefined => {
	const defaultOptions: GetOptions<T> = {
		prefix: "biome",
	};

	options = { ...defaultOptions, ...options };

	return options?.default !== undefined
		? workspace
				.getConfiguration(options?.prefix, options?.scope)
				.get<T>(key, options?.default)
		: workspace.getConfiguration(options?.prefix, options?.scope).get<T>(key);
};

/**
 * Options for retrieving a setting
 */
export type GetOptions<T> = Partial<{
	/**
	 * A prefix to add to the setting key
	 */
	prefix: string;

	/**
	 * The scope of the setting
	 */
	scope: ConfigurationScope;

	/**
	 * The default value to return if the setting is not found
	 */
	default: T;
}>;
