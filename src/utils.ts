import { constants, accessSync } from "node:fs";
import { FileType, RelativePattern, Uri, workspace } from "vscode";
import { operatingMode } from "./constants";
import { debug } from "./logger";
import type { Project } from "./project";
import { state } from "./state";

/**
 * Generates a platform-specific versioned binary name
 *
 * This function generates a platform-specific versioned binary name for the
 * current platform and given version of Biome.
 *
 * @param version The version of Biome
 *
 * @example "biome-1.0.0" (on Linux, macOS, and other Unix-like systems)
 * @example "biome.exe-1.0.0" (on Windows)
 */
export const generatePlatformSpecificVersionedBinaryName = (
	version: string,
) => {
	return `biome-${version}${process.platform === "win32" ? ".exe" : ""}`;
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
 * Substracts the second string from the first string
 */
export const subtractURI = (original: Uri, subtract: Uri): Uri | undefined => {
	const _original = original.fsPath;
	const _subtract = subtract.fsPath;

	let result = _original.replace(_subtract, "");

	result = result === "" ? "/" : result;

	return Uri.parse(result);
};

/**
 * Generates a short URI for display purposes
 *
 * This function generates a short URI for display purposes. It takes into
 * account the operating mode of the extension and the project folder name.
 *
 * This is primarily used for naming logging channels.
 *
 * @param project The project for which the short URI is generated
 *
 * @example "/hello-world" (in single-root mode)
 * @example "workspace-folder-1::/hello-world" (in multi-root mode)
 */
export const shortURI = (project: Project) => {
	const prefix =
		operatingMode === "multi-root" ? `${project.folder.name}::` : "";
	return `${prefix}${subtractURI(project.path, project.folder.uri).fsPath}`;
};

/**
 * Checks if there are any open untitled documents in the workspace
 *
 * This function verifies the presence of open documents within the workspace
 * that have not yet been saved to disk. It will return true if any such
 * documents are identified, otherwise, it returns false if none are found.
 *
 * This is typically used to determine if the user is working with an untitled
 * document in the workspace.
 */
export const hasUntitledDocuments = (): boolean => {
	return (
		workspace.textDocuments.find(
			(document) => document.isUntitled === true,
		) !== undefined
	);
};

/**
 * Checks if there are any open VS Code User Data documents in the workspace
 *
 * This function verifies the presence of open documents within the workspace
 * that utilize the vscode-userdata scheme. It will return true if any such
 * documents are identified, otherwise, it returns false if none are found.
 *
 * This is typically used to determine if the user's settings.json file is open
 * in the workspace.
 */
export const hasVSCodeUserDataDocuments = (): boolean => {
	return (
		workspace.textDocuments.find(
			({ uri }) => uri.scheme === "vscode-userdata",
		) !== undefined
	);
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

/**
 * Checks if a file is executable
 *
 * This function checks if a file is executable using Node's `accessSync` function.
 * It returns true if the file is executable, otherwise it returns false.
 *
 * This is used to ensure that downloaded Biome binaries are executable.
 */
export const fileIsExecutable = (uri: Uri): boolean => {
	try {
		accessSync(uri.fsPath, constants.X_OK);
		return true;
	} catch {
		return false;
	}
};

/**
 * Checks if a directory contains any node dependencies
 *
 * This function checks if a directory contains any node dependencies by
 * searching for any `package.json` files within the directory. It returns true
 * if any `package.json` files are found, otherwise it returns false.
 */
export const hasNodeDependencies = async (path: Uri) => {
	const results = await workspace.findFiles(
		new RelativePattern(path, "**/package.json"),
	);

	return results.length > 0;
};

/**
 * Clears temporary binaries
 *
 * This function clears any temporary binaries that may have been created by
 * the extension. It deletes the `tmp-bin` directory within the global storage
 * directory.
 */
export const clearTemporaryBinaries = async () => {
	const binDirPath = Uri.joinPath(state.context.globalStorageUri, "tmp-bin");
	if (await directoryExists(binDirPath)) {
		workspace.fs.delete(binDirPath, {
			recursive: true,
		});
		debug("Cleared temporary binaries.", {
			path: binDirPath.fsPath,
		});
	}
};
