import { type ConfigurationScope, FileType, Uri, workspace } from "vscode";
import type { Project } from "./project";

/**
 * Returns the platform-specific NPM package name of the Biome CLI
 *
 * This function computes and returns the platform-specific NPM package name of
 * the Biome CLI. The package name is computed based on the current platform and
 * architecture, and whether the system's C library is musl.
 *
 * @example "@biomejs/cli-linux-x64-musl"
 * @example "@biomejs/cli-darwin-x64"
 * @example "@biomejs/cli-win32-x64"
 *
 * @returns The platform-specific NPM package name of the Biome CLI
 */
export const getPackageName = (): string => {
	const flavor = process.platform === "linux" ? "-musl" : "";

	return `@biomejs/cli-${process.platform}-${process.arch}${flavor}`;
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
 * Supported languages for the extension
 *
 * This array contains the supported languages for the extension. These are
 * language identifiers, not file extensions.
 */
export const supportedLanguages: string[] = [
	"astro",
	"css",
	"javascript",
	"javascriptreact",
	"json",
	"jsonc",
	"svelte",
	"typescript",
	"typescriptreact",
	"vue",
];

/**
 * The name of the Biome executable
 *
 * This constant contains the name of the Biome executable. The name is suffixed
 * with ".exe" on Windows, and is returned as-is on other platforms.
 */

export const binaryName = (name = "biome") => `${name}${binaryExtension}`;

export const binaryExtension = process.platform === "win32" ? ".exe" : "";

/**
 * Name of the Biome CLI NPM package
 */
export const packageName = getPackageName();

/**
 * The platform identifier
 */
export const platform = `${process.platform}-${process.arch}${
	process.platform === "linux" ? "-musl" : ""
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

export const shortURI = (project: Project) => {
	const prefix = mode === "multi-root" ? `${project.folder.name}::` : "";
	return `${prefix}${subtractURI(project.path, project.folder.uri).fsPath}`;
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
 * Indicates whether there are any untitled documents currently open in the
 * workspace
 */
export const hasUntitledDocuments = (): boolean =>
	workspace.textDocuments.find((doc) => doc.isUntitled) !== undefined;

export const hasVSCodeUserDataDocuments = (): boolean =>
	workspace.textDocuments.find(
		(doc) => doc.uri.scheme === "vscode-userdata",
	) !== undefined;

export const platformPackageName = `biome-${platform}`;
