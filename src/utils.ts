import {
	type SpawnSyncOptionsWithStringEncoding,
	spawnSync,
} from "node:child_process";
import { homedir } from "node:os";
import { extname, isAbsolute } from "node:path";
import {
	type ConfigurationScope,
	FileType,
	Uri,
	type WorkspaceFolder,
	window,
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
		// FileType.SymbolicLink is normally OR'd with File/Directory. Treat a
		// non-directory symlink as an existing file so WinGet Links (and similar
		// reparse-point shims) are not skipped by PATH search.
		if ((stat.type & FileType.File) > 0) {
			return true;
		}
		if (
			(stat.type & FileType.SymbolicLink) > 0 &&
			(stat.type & FileType.Directory) === 0
		) {
			return true;
		}
		return false;
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
 * Messages about unresolved variables that have already been shown, so that
 * repeated configuration requests don't show the same popup again.
 */
const reportedUnresolvedVariables = new Set<string>();

/**
 * Resolves common VS Code variables in user-provided settings.
 *
 * This mirrors the behavior used by other language tool extensions for path-like
 * settings such as `${workspaceFolder}`, `${userHome}`, and `${env:NAME}`.
 */
export const resolveVariables = (
	value: string,
	workspaceFolder?: WorkspaceFolder,
): string => {
	let resolved = value;
	const substitutions = new Map<string, string>();
	const home = homedir();
	const userHomeVariable = "$" + "{userHome}";
	const workspaceFolderVariable = "$" + "{workspaceFolder}";

	if (home) {
		substitutions.set(userHomeVariable, home);
	}

	if (workspaceFolder) {
		substitutions.set(workspaceFolderVariable, workspaceFolder.uri.fsPath);
	}

	for (const folder of workspace.workspaceFolders ?? []) {
		substitutions.set(`\${workspaceFolder:${folder.name}}`, folder.uri.fsPath);
	}

	for (const [key, substitution] of substitutions) {
		resolved = resolved.replaceAll(key, substitution);
	}

	// Resolve environment variables. Like VS Code, undefined ones resolve to an
	// empty string.
	resolved = resolved.replace(
		/\$\{env:([^}]+)\}/g,
		(_, name: string) => process.env[name] ?? "",
	);

	// Workspace folder variables cannot be resolved when no matching folder is
	// open, so let the user know instead of silently using a broken path.
	const unresolved = resolved.match(/\$\{workspaceFolder(?::[^}]+)?\}/);

	if (unresolved) {
		const message = `Biome could not resolve "${unresolved[0]}" in "${value}". Make sure a matching workspace folder is open.`;

		if (!reportedUnresolvedVariables.has(message)) {
			reportedUnresolvedVariables.add(message);
			void window.showErrorMessage(message);
		}
	}

	return resolved;
};

/**
 * Resolves variables in the `biome` settings sent to the language server
 *
 * `configurationPath` is the only path setting the server reads. Other path
 * settings, such as `biome.lsp.bin`, are resolved by the extension itself.
 */
export const normalizeBiomeSettings = (
	settings: unknown,
	resource?: Uri,
): unknown => {
	if (
		typeof settings !== "object" ||
		settings === null ||
		Array.isArray(settings)
	) {
		return settings;
	}

	const workspaceFolder = resource
		? workspace.getWorkspaceFolder(resource)
		: undefined;
	const result = { ...(settings as Record<string, unknown>) };

	if (typeof result.configurationPath === "string") {
		result.configurationPath = resolveVariables(
			result.configurationPath,
			workspaceFolder,
		);
	}

	return result;
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
		const resolvedPath = resolveVariables(lspBin, workspaceFolder);

		// If the specified path is relative, resolve it against the root of
		// the workspace folder (if any).
		if (workspaceFolder && !isAbsolute(resolvedPath)) {
			return Uri.file(
				Utils.resolvePath(workspaceFolder.uri, resolvedPath).fsPath,
			);
		}

		return Uri.file(resolvedPath);
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
	const spawnOptions: SafeSpawnSyncOptions = { ...(options ?? {}) };

	const extension = extname(command).toLowerCase();

	// If the command is a powershell script, run it through powershell
	if (extension === ".ps1") {
		args = [command, ...args];
		command = "powershell.exe";
	}

	// Windows .cmd/.bat shims (npm, pnpm, Volta, etc.) cannot be spawned without
	// a shell — Node returns EINVAL. Build one quoted command string so paths with
	// spaces work and we avoid DEP0190 (args + shell: true).
	if (extension === ".cmd" || extension === ".bat") {
		command = `"${command}" ${args.join(" ")}`;
		args = [];
		spawnOptions.shell = true;
	}

	try {
		const result = spawnSync(command, args, {
			...spawnOptions,
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
