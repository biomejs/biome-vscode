import type { Uri, WorkspaceFolder } from "vscode";

/**
 * Definition of a project in the configuration.
 */
export type ProjectDefinitionFromConfig =
	| SingleRootWorkspaceProjectDefinitionFromConfig
	| MultiRootWorkspaceProjectDefinitionFromConfig;

export type SingleRootWorkspaceProjectDefinitionFromConfig = {
	/**
	 * Path to the project, within the workspace folder
	 */
	path: string;

	/**
	 * Path to the project's configuration file, within the workspace folder
	 */
	configFile?: string;
};

export type MultiRootWorkspaceProjectDefinitionFromConfig = {
	/**
	 * Name of the workspace folder
	 */
	folder: string;

	/**
	 * Path to the project, within the workspace folder
	 */
	path?: string;

	/**
	 * Path to the project's configuration file, within the workspace folder
	 */
	configFile?: string;
};

/**
 * Definition of a project in the configuration.
 */
export type ProjectDefinition =
	| SingleRootWorkspaceProjectDefinition
	| MultiRootWorkspaceProjectDefinition;

export type SingleRootWorkspaceProjectDefinition = {
	/**
	 * Path to the project, within the workspace folder
	 */
	path: Uri;

	/**
	 * Path to the project's configuration file, within the workspace folder
	 */
	configFile?: Uri;
};

export type MultiRootWorkspaceProjectDefinition = {
	/**
	 * Name of the workspace folder
	 */
	folder: WorkspaceFolder;

	/**
	 * Path to the project, within the workspace folder
	 */
	path?: Uri;

	/**
	 * Path to the project's configuration file, within the workspace folder
	 */
	configFile?: Uri;
};
