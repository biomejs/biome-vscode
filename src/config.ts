import {
	type ConfigurationScope,
	type WorkspaceFolder,
	workspace,
} from "vscode";
import type { ProjectDefinition } from "./project";
type LspBinSetting = string | Record<string, string>;

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
	}>,
): T | undefined => {
	if (options?.default !== undefined)
		return (
			workspace.getConfiguration("biome", options?.scope).get<T>(key) ??
			options.default
		);

	return workspace.getConfiguration("biome", options?.scope).get<T>(key);
};

export const isEnabled = (folder?: WorkspaceFolder) => {
	if (!folder) {
		return config("enabled", { default: true }) === true;
	}

	return config("enabled", { default: true, scope: folder.uri }) === true;
};

/**
 * Determines whether the extension is enabled globally
 *
 * This function determines whether the extension is enabled globally. This is
 * useful to conditional enable or disable functionality based on the extension's
 * configuration at the global/user level.
 */
export const isEnabledGlobally = (): boolean => {
	return (
		workspace.getConfiguration("biome").inspect<boolean>("enabled")
			.globalValue === true
	);
};

/**
 * Determines whether a Biome configuration file is required in the given
 * workspace folder for the extension to start.
 */
export const workspaceFolderRequiresConfigFile = (
	folder: WorkspaceFolder,
): boolean => {
	return (
		config("requireConfigFile", { default: false, scope: folder.uri }) ===
		true
	);
};

/**
 * Retrieves the project definitions for the given workspace folder.
 */
export const getProjectDefinitions = (
	folder: WorkspaceFolder,
	defaultValue: ProjectDefinition[] = [],
) => {
	return config<ProjectDefinition[]>("projects", {
		scope: folder.uri,
		default: defaultValue,
	});
};

/**
 * Retrieves the `biome.lsp.bin` setting
 *
 * This function retrieves the `biome.lsp.bin` setting from the given scope. It
 * also handles retrieving the setting from the deprecated `biome.lspBin` setting
 * transparently for users that have not yet migrated to the new setting.
 */
export const getLspBin = (
	scope: ConfigurationScope,
): LspBinSetting | undefined => {
	const lspBin = config<LspBinSetting>("lsp.bin", {
		default: undefined,
		scope: scope,
	});

	const deprecatedLspBin = config<string>("lspBin", {
		default: undefined,
		scope: scope,
	});

	switch (lspBin) {
		case undefined:
			return deprecatedLspBin;
		case null:
			return deprecatedLspBin;
		case "":
			return deprecatedLspBin;
		default:
			return lspBin;
	}
};
