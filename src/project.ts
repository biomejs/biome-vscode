import {
	type TextEditor,
	Uri,
	type WorkspaceFolder,
	window,
	workspace,
} from "vscode";
import { Utils } from "vscode-uri";
import { supportedLanguageIdentifiers } from "./constants";
import { debug } from "./logger";
import { state } from "./state";
import {
	asyncFilter,
	directoryExists,
	fileExists,
	getPathRelativeToWorkspaceFolder,
	getWorkspaceFolderByName,
	runningInSingleFileMode,
	shortURI,
} from "./utils";

export type Project = {
	folder?: WorkspaceFolder;
	path: Uri;
};

export type ProjectDefinition = {
	folder?: WorkspaceFolder;
	path?: Uri;
};

/**
 * Updates the currently active project
 *
 * This function updates the currently active project based on the active text
 * editor by checking if the document in the active text editor is part of a
 * project. If it is, the active project is updated to reflect this change.
 */
export const updateActiveProject = (editor: TextEditor | undefined) => {
	const project = editor
		? [...state.sessions.keys()].find((project) =>
				editor.document?.uri.fsPath.startsWith(project.path.fsPath),
			)
		: undefined;

	state.hidden =
		editor?.document === undefined ||
		!supportedLanguageIdentifiers.includes(editor.document.languageId);

	state.activeProject = project;
};

/**
 * Creates all projects
 *
 * This function creates all the projects according to the collected project
 * definitions. It is responsible for filtering out project definitions that
 * are invalid, such as those that reference non-existing directories or those
 * that require a configuration file that does not exist.
 */
export const createProjects = async (): Promise<Project[]> => {
	const definitions = getProjectDefinitions();

	// Filter out project definitions whose path does not exist on disk
	const projects = (await asyncFilter(definitions, async (definition) =>
		definition.path ? await directoryExists(definition.path) : false,
	)) as Project[];

	// Filter out project definitions for which the configuration file does not
	// exist if one is required.
	return await asyncFilter(projects, configFileExistsIfRequired);
};

/**
 * Retrieves all project definitions with respect to the operating mode
 */
const getProjectDefinitions = (): ProjectDefinition[] => {
	debug("Retrieving project definitions");

	if (runningInSingleFileMode()) {
		const definition = getProjectDefinitionForSingleFile();
		return definition ? [definition] : [];
	}

	return getProjectDefinitionsForWorkspace();
};

/**
 * Retrieves the project definition for a single file in single-file mode
 */
const getProjectDefinitionForSingleFile = (): ProjectDefinition | undefined => {
	debug("Looking for project definition for single file");

	const singleFileURI = window.activeTextEditor?.document.uri;

	// If the active text editor is not a file on disk, we abort.
	// Untitled files are handled by the global session.
	if (!singleFileURI || singleFileURI.scheme !== "file") {
		debug("Could not create project definition for single file.", {
			uri: singleFileURI?.fsPath,
			scheme: singleFileURI?.scheme,
		});
		return;
	}

	const parentFolderURI = Uri.file(
		Utils.resolvePath(singleFileURI, "..").fsPath,
	);

	debug("Created project definition for single file", {
		uri: singleFileURI.fsPath,
		parentFolderURI: parentFolderURI.fsPath,
	});

	return {
		path: parentFolderURI,
	};
};

/**
 * Retrieves the project definitions for the entire workspace
 */
const getProjectDefinitionsForWorkspace = (): ProjectDefinition[] => {
	debug("Retrieving project definitions for workspace");

	const projectDefinitions: ProjectDefinition[] = [];

	for (const folder of workspace.workspaceFolders ?? []) {
		const definitions = getProjectDefinitionsForWorkspaceFolder(folder);

		debug(
			`Retrieved ${definitions.length} project definitions for workspace folder: "${folder.name}"`,
		);

		projectDefinitions.push(...definitions);
	}

	debug(
		`Retrieved ${projectDefinitions.length} project definitions for workspace`,
	);

	return projectDefinitions;
};

/**
 * Retrieves the project definitions that are relevant to a given workspace folder
 *
 * @param folder The workspace folder for which to retrieve project definitions
 */
const getProjectDefinitionsForWorkspaceFolder = (
	folder: WorkspaceFolder,
): ProjectDefinition[] => {
	debug(
		`Retrieving project definitions for workspace folder: "${folder.name}"`,
	);

	type RawProjectDefinition = {
		path?: string;
		folder?: string;
	};

	// Project definitions can be specified at the workspace level or at the
	// workspace folder level. Since the biome.projects configuration setting
	// is an array, settings precedence dictates that the setting will be
	// overridden by the workspace folder level setting, if present.
	let rawProjectDefinitions =
		workspace
			.getConfiguration("biome", folder.uri)
			.get<RawProjectDefinition[]>("projects") ?? [];

	if (rawProjectDefinitions.length === 0) {
		debug(
			`Did not find any user-defined project definitions for workspace folder: "${folder.name}"`,
		);
	}

	// If we rely on the workspace level configuration, project definitions will
	// contain the "folder" property, which we use to determine to which workspace
	// folder the project definition belongs. We'll filter out project definitions
	// that do not belong to the workspace folder we're currently processing. Also,
	// project definitions that do not have a folder property have been defined at
	// the workspace folder level, so we'll keep those.
	rawProjectDefinitions = rawProjectDefinitions.filter((project) => {
		if (!project.folder) {
			return true;
		}

		if (getWorkspaceFolderByName(project.folder) === folder) {
			return true;
		}

		return false;
	});

	// If we're left with no project definitions, we'll create a default project
	// definition for the root of the workspace folder.
	if (rawProjectDefinitions.length === 0) {
		rawProjectDefinitions.push({
			path: "/",
			folder: folder.name,
		});

		debug(
			`Created a default project definition for root of workspace folder: "${folder.name}"`,
		);
	}

	// Now that we have the raw project definitions that are relevant to the workspace
	// folder, we can create the project definitions that we'll use to create the
	// projects. We're not yet filtering project definitions based on whether the
	// project directory exists on disk or whether the configuration file exists
	// if required. We'll do that when we create the projects.
	return rawProjectDefinitions.map((project) => {
		const projectPath = getPathRelativeToWorkspaceFolder(
			folder,
			project.path,
		);

		return {
			folder: folder,
			path: projectPath,
		};
	});
};

/**
 * Determines if the configuration file of a given project definition exists on disk
 * if one is required by the configuration of the project definition's workspace folder
 */
const configFileExistsIfRequired = async (
	definition: ProjectDefinition,
): Promise<boolean> => {
	debug("Checking if project requires configuration file", {
		projectPath: shortURI(definition),
	});

	const required = workspace
		.getConfiguration("biome", definition.path)
		.get<boolean>("requireConfigFile");

	// The workspace folder does not require a configuration file for projects, so
	// we can return early.
	if (!required) {
		debug("Project does not require configuration file, skipping check", {
			projectPath: shortURI(definition),
		});
		return true;
	}

	debug("Project requires configuration file, checking if it exists", {
		projectPath: shortURI(definition),
	});

	// The workspace folder requires a configuration file for projects, so we need to
	// check if any of the accepted configuration files exist on disk under the project
	// directory.
	const candidates = definition.path
		? [
				Uri.joinPath(definition.path, "biome.json"),
				Uri.joinPath(definition.path, "biome.jsonc"),
			]
		: [];

	debug("Ensuring any of the candidate configuration files exist", {
		candidates: candidates.map((candidate) => candidate?.fsPath).join(", "),
	});

	// Filter out candidates that do not exist on disk
	const existing = await asyncFilter(candidates, fileExists);

	debug("Filtered out non-existing configuration files", {
		existing: existing.map((file) => file.fsPath).join(", "),
	});

	// If at least one configuration file exists, we're good to go.
	if (existing.length > 0) {
		debug("Found at least one configuration file for project. Continuing.");
		return true;
	}

	debug("No configuration file found for project", {
		projectPath: shortURI(definition),
	});

	return false;
};
