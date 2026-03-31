import {
	type SpawnSyncOptionsWithStringEncoding,
	spawnSync,
} from "node:child_process";
import { extname, isAbsolute } from "node:path";
import {
	type ConfigurationScope,
	FileType,
	Uri,
	type WorkspaceFolder,
	workspace,
} from "vscode";
import { Utils } from "vscode-uri";

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
	workspaceFolder?: WorkspaceFolder,
): Uri | Record<string, Uri> | undefined => {
	const lspBin =
		config<string | Record<string, string>>("lsp.bin", {
			scope: workspaceFolder,
		}) || config<string>("lspBin", { scope: workspaceFolder }); // deprecated setting for fallback.

	const resolvePath = (lspBin: string, workspaceFolder?: WorkspaceFolder) => {
		// If the specified path is relative, resolve it against the root of
		// the workspace folder (if any).
		if (workspaceFolder && !isAbsolute(lspBin)) {
			return Uri.file(Utils.resolvePath(workspaceFolder.uri, lspBin).fsPath);
		}

		return Uri.file(lspBin);
	};

	if (typeof lspBin === "string") {
		if (!lspBin) return;
		return resolvePath(lspBin, workspaceFolder);
	}

	if (typeof lspBin === "object") {
		const result: Record<string, Uri> = {};
		for (const key in lspBin) {
			result[key] = resolvePath(lspBin[key], workspaceFolder);
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

export type SafeSpawnSyncOptions = Omit<
	SpawnSyncOptionsWithStringEncoding,
	"encoding"
>;

export const safeSpawnSync = (
	command: string,
	args: readonly string[] = [],
	options?: SafeSpawnSyncOptions,
): string | undefined => {
	let output: string | undefined;

	// If the command is a powershell script, run it through powershell
	if (extname(command) === ".ps1") {
		args = [command, ...args];
		command = "powershell.exe";
	}

	try {
		const result = spawnSync(command, args, {
			...(options ?? {}),
			encoding: "utf8",
		});

		if (result.error || result.status !== 0) {
			output = undefined;
		} else {
			const trimmed = result.stdout.trim();
			output = trimmed ? trimmed : undefined;
		}
	} catch {
		output = undefined;
	}

	return output;
};
