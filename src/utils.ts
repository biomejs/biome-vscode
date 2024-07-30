import { spawnSync } from "node:child_process";
import { type ConfigurationScope, FileType, Uri, workspace } from "vscode";
import { activationEvents } from "../package.json";

/**
 * Checks whether the system's C library is musl
 *
 * This function checks whether the system's C library is musl by running the
 * `ldd --version` command and checking the output for the string "musl".
 *
 * @returns Whether the system's C library is musl
 */
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
		return (
			stat.type === FileType.File ||
			stat.type === (FileType.File | FileType.SymbolicLink)
		);
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
	options?: Partial<{
		scope: ConfigurationScope;
		default: T;
		level?: "global" | "workspace" | "workspaceFolder";
	}>,
): T | undefined => {
	if (options.level) {
		const { globalValue, workspaceValue, workspaceFolderValue } = workspace
			.getConfiguration("biome", options?.scope)
			.inspect<T>(key);

		switch (options.level) {
			case "global":
				return globalValue || options?.default;
			case "workspace":
				return workspaceValue || options?.default;
			case "workspaceFolder":
				return workspaceFolderValue || options?.default;
		}
	}

	return options?.default !== undefined
		? workspace
				.getConfiguration("biome", options?.scope)
				.get<T>(key, options?.default)
		: workspace.getConfiguration("biome", options?.scope).get<T>(key);
};

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

export const binaryExtension = process.platform === "win32" ? ".exe" : "";

/**
 * Name of the Biome CLI NPM package
 */
export const packageName = getPackageName();

/**
 * The platform identifier
 */
export const platform = `${process.platform}-${process.arch}${
	isMusl() ? "-musl" : ""
}`;

/**
 * Substracts the second string from the first string
 */
export const subtractURI = (original: Uri, subtract: Uri): Uri | undefined => {
	const _original = original.fsPath;
	const _subtract = subtract.fsPath;

	let result = _original.replace(_subtract, "");

	result = result === "" ? "/" : result;

	return Uri.parse(result);
};

export const determineMode = ():
	| "single-file"
	| "single-root"
	| "multi-root" => {
	if (workspace.workspaceFolders === undefined) {
		return "single-file";
	}

	if (workspace.workspaceFolders.length > 1) {
		return "multi-root";
	}

	return "single-root";
};

export const mode = determineMode();

/**
 * Indicates whether the extension is enabled
 */
export const isEnabled = () =>
	config<boolean>("enabled", { level: "global", default: true }) === true;

/**
 * Indicates whether the extension is disabled
 *
 * This function is the inverse of `isEnabled`.
 */
export const isDisabled = () => !isEnabled();

/**
 * Indicates whether there are any untitled documents currently open in the
 * workspace
 */
export const hasUntitledDocuments = (): boolean =>
	workspace.textDocuments.find((doc) => doc.isUntitled) !== undefined;

export const platformPackageName = `biome-${platform}`;
