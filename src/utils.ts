import { type ConfigurationScope, FileType, Uri, workspace } from "vscode";

/**
 * Checks whether a file exists
 *
 * This function checks whether a file exists at the given URI using VS Code's
 * FileSystem API.
 *
 * @param uri URI of the file to check
 * @returns Whether the file exists
 */
export const fileExists = async (uri: Uri): Promise<boolean> => {
	try {
		const stat = await workspace.fs.stat(uri);
		return (stat.type & FileType.File) > 0;
	} catch (_err) {
		return false;
	}
};

/**
 * Retrieves a setting
 *
 * This function retrieves a setting from the workspace configuration. By
 * default, settings are looked up under the "biome" prefix.
 *
 * @param key The key of the setting to retrieve
 */
export const config: {
	<T>(
		key: string,
		options: Partial<{ scope: ConfigurationScope }> & { default: T },
	): T;
	<T>(
		key: string,
		options?: Partial<{ scope: ConfigurationScope; default?: T }>,
	): T | undefined;
} = <T>(
	key: string,
	options?: Partial<{
		scope: ConfigurationScope;
		default: T;
	}>,
): T | undefined => {
	if (options?.default !== undefined)
		return (
			workspace.getConfiguration("biome", options?.scope).get<T>(key) ??
			options.default
		);

	return workspace.getConfiguration("biome", options?.scope).get<T>(key);
};

/**
 * Retrieves the `biome.lsp.bin` setting
 *
 * This function retrieves the `biome.lsp.bin` setting from the given scope. It
 * also handles retrieving the setting from the deprecated `biome.lspBin` setting
 * transparently for users that have not yet migrated to the new setting.
 */
export const getLspBin = (
	scope?: ConfigurationScope,
): Uri | Record<string, Uri> | undefined => {
	const lspBin =
		config<string | Record<string, string>>("lsp.bin", { scope }) ||
		config<string>("lspBin", { scope }); // deprecated setting for fallback.

	if (typeof lspBin === "string") {
		if (!lspBin) return;

		return Uri.file(lspBin);
	}

	if (typeof lspBin === "object") {
		const result: Record<string, Uri> = {};
		for (const key in lspBin) {
			result[key] = Uri.file(lspBin[key]);
		}
		return result;
	}
};

/**
 * Debounces a function
 *
 * This function debounces a function by waiting for a specified delay before
 * executing it. It returns a new function that wraps the original function and
 * only executes it after the specified delay has passed.
 */
export const debounce = <TArgs extends unknown[]>(
	fn: (...args: TArgs) => void,
	delay = 300,
) => {
	let timeout: NodeJS.Timeout | undefined;
	return (...args: TArgs) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), delay);
	};
};
