import { spawnSync } from "node:child_process";
import {
	type ConfigurationScope,
	ConfigurationTarget,
	FileType,
	type Uri,
	workspace,
} from "vscode";
import { activationEvents } from "../package.json";

export const isMusl = () => {
	if (process.platform !== "linux") {
		return false;
	}

	try {
		const output = spawnSync("ldd", ["--version"], { encoding: "utf8" });
		return output.stdout.includes("musl") || output.stderr.includes("musl");
	} catch {
		return false;
	}
};

/**
 * Returns the platform-specific NPM package name of the Biome CLI
 *
 * This function computes and returns the platform-specific NPM package name of
 * the Biome CLI. The package name is computed based on the current platform and
 * architecture, and whether the system's C library is musl.
 *
 * @example "@biomejs/cli-linux-x64"
 * @example "@biomejs/cli-linux-x64-musl"
 * @example "@biomejs/cli-darwin-x64"
 * @example "@biomejs/cli-win32-x64"
 *
 * @returns The platform-specific NPM package name of the Biome CLI
 */
export const getPackageName = (): string => {
	const libc = `${isMusl() ? "-musl" : ""}`;

	return `@biomejs/cli-${process.platform}-${process.arch}${libc}`;
};

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
		return stat.type === FileType.File;
	} catch (err) {
		return false;
	}
};

/**
 * Checks whether a directory exists
 *
 * This function checks whether a directory exists at the given URI using VS Code's
 * FileSystem API.
 *
 * @param uri URI of the directory to check
 * @returns Whether the directory exists
 */
export const directoryExists = async (uri: Uri): Promise<boolean> => {
	try {
		const stat = await workspace.fs.stat(uri);
		return stat.type === FileType.Directory;
	} catch (err) {
		return false;
	}
};

/**
 * Checks whether any of the given files exist
 *
 * This function checks whether any of the given files exist using the
 * `fileExists` function.
 *
 * @param uris URIs of the files to check
 * @returns Whether any of the files exist
 */
export const anyFileExists = async (uris: Uri[]): Promise<boolean> => {
	for (const uri of uris) {
		if (await fileExists(uri)) {
			return true;
		}
	}
	return false;
};

/**
 * Retrieves a setting
 *
 * This function retrieves a setting from the workspace configuration. By
 * default, settings are looked up under the "biome" prefix.
 *
 * @param key The key of the setting to retrieve
 */
export const config = <T>(
	key: string,
	options?: ConfigOptions<T>,
): T | undefined => {
	const defaultOptions: ConfigOptions<T> = {
		prefix: "biome",
	};

	options = { ...defaultOptions, ...options };

	return options?.default !== undefined
		? workspace
				.getConfiguration(options?.prefix, options?.scope)
				.get<T>(key, options?.default)
		: workspace
				.getConfiguration(options?.prefix, options?.scope)
				.get<T>(key);
};

/**
 * Options for retrieving a setting
 */
export type ConfigOptions<T> = Partial<{
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

/**
 * Supported languages for the extension
 *
 * This array contains the supported languages for the extension. The languages
 * are derived from the activation events in the `package.json` file.
 */
export const supportedLanguages = activationEvents
	.filter((name) => name.startsWith("onLanguage:"))
	.map((name) => name.replace("onLanguage:", "").trim());

/**
 * The name of the Biome executable
 *
 * This constant contains the name of the Biome executable. The name is suffixed
 * with ".exe" on Windows, and is returned as-is on other platforms.
 */
export const binaryName = `biome${process.platform === "win32" ? ".exe" : ""}`;

/**
 * The NPM package name of the Biome CLI
 */
export const packageName = getPackageName();

/**
 * The platform identifier
 */
export const platform = `${process.platform}-${process.arch}${
	isMusl() ? "-musl" : ""
}`;
