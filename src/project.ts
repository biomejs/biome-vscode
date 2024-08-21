import {
	type TextEditor,
	Uri,
	type WorkspaceFolder,
	window,
	workspace,
} from "vscode";
import { Utils } from "vscode-uri";
import { findBiomeLocally } from "./binary-finder";
import {
	getProjectDefinitions,
	isEnabled,
	workspaceFolderRequiresConfigFile,
} from "./config";
import { debug, error, info, warn } from "./logger";
import { state } from "./state";
import { directoryExists, fileExists, mode, supportedLanguages } from "./utils";

export type Project = {
	folder?: WorkspaceFolder;
	path: Uri;
	configFile?: Uri;
	bin: Uri;
};

export type ProjectDefinition = {
	folder?: string;
	path?: string;
	configFile?: string;
};

export const createProjects = async () => {
	if (mode === "single-file") {
		const project = await createSingleFileProject();
		return project ? [project] : [];
	}

	return await createWorkspaceProjects();
};

/**
 * Creates a new Biome project
 *
 * This function creates a new Biome project and automatically resolves the
 * path to the Biome binary in the context of the project.
 *
 * @param folder The parent workspace folder of the project
 * @param path The URI of the project directory, relative to the workspace folder
 * @param configFile The URI of the project's Biome configuration file
 */
const createProject = async ({
	folder,
	path,
	configFile,
}: {
	folder?: WorkspaceFolder;
	path: Uri;
	configFile?: Uri;
}): Promise<Project | undefined> => {
	// Resolve the path to the Biome binary
	const findResult = await findBiomeLocally(path);

	// If the Biome binary could not be found, error out
	if (!findResult) {
		error("Could not find the Biome binary");
		return;
	}

	return {
		folder: folder,
		path: path,
		configFile: configFile,
		bin: findResult.bin,
	};
};

const createSingleFileProject = async (): Promise<Project> => {
	// Retrieve the URI of the document currently present in the active
	// text editor. We need this information to determine the parent
	// directory of the file.
	const singleFileURI = window.activeTextEditor?.document.uri;

	// If the active text editor is not a file on disk, we abort.
	// Untitled files are handled by the global session.
	if (!singleFileURI || singleFileURI.scheme !== "file") {
		return;
	}

	const parentFolderURI = Uri.parse(
		Utils.resolvePath(singleFileURI, "..").fsPath,
	);

	return await createProject({
		path: parentFolderURI,
		folder: undefined,
		configFile: undefined,
	});
};

const createWorkspaceProjects = async (): Promise<Project[]> => {
	const projects: Project[] = [];

	for (const folder of workspace.workspaceFolders ?? []) {
		projects.push(...(await createWorkspaceFolderProjects(folder)));
	}

	return projects;
};

const configFileExistsIfRequired = async (
	folder: WorkspaceFolder,
	project: ProjectDefinition,
): Promise<boolean> => {
	// If the workspace folders does not require a configuration file, none of
	// the projects in the workspace folder do, so we return early.
	if (!workspaceFolderRequiresConfigFile(folder)) {
		return true;
	}

	const acceptedConfigFiles = [
		...(project.configFile
			? [Uri.joinPath(folder.uri, project.path, project.configFile)]
			: []),
		Uri.joinPath(folder.uri, project.path, "biome.json"),
		Uri.joinPath(folder.uri, project.path, "biome.jsonc"),
	];

	let configFileExists = false;
	for (const configFile of acceptedConfigFiles) {
		if (await fileExists(configFile)) {
			configFileExists = true;
			break;
		}
	}

	if (!configFileExists) {
		warn("No configuration file found.");
	}

	return configFileExists;
};

/**
 * Detects projects in the given workspace folder
 *
 * This function will detect projects in the given workspace folder by looking
 * for project definitions in the workspace folder's configuration. If no project
 * definitions are found, it will create a single project at the root of the
 * workspace folder.
 *
 * Project definitions that reference workspace folders that do not exist will
 * be ignored, as will project definitions that do not have a configuration file
 * if they require one.
 */
const createWorkspaceFolderProjects = async (folder: WorkspaceFolder) => {
	// If Biome is disabled in the workspace folder, we skip project creation
	// entirely for that workspace folder.
	if (!isEnabled(folder)) {
		return [];
	}

	// Retrieve the project definitions in the workspace folder's configuration
	// or fall back to a default project definition which references the workspace
	// folder itself.
	let projectDefinitions = getProjectDefinitions(folder, [
		{
			folder: folder.name,
			path: "/",
		},
	]);

	// Only consider project definitions that have a matching workspace folder
	projectDefinitions = projectDefinitions.filter((project) => {
		// If the project definition does not specify a workspace folder, as would
		// be the case when the project definitions have been specified in the
		// workspace folder's configuration, we consider it to be valid.
		if (!project.folder) {
			return true;
		}

		// If the project definition specifies a workspace folder, we only consider
		// it valid if the workspace folder name matches. This is the case when the
		// project definition has been specified at the workspace level.
		return project.folder === folder.name;
	});

	// Filter out project definitions whose path does not exist on disk
	const definitionsOnDisk = await Promise.all(
		projectDefinitions.map(async (definition) => {
			const existsOnDisk = await directoryExists(
				Uri.joinPath(folder.uri, definition.path),
			);
			if (!existsOnDisk) {
				warn(
					`Project directory ${Uri.joinPath(folder.uri, definition.path)} does not exist on disk, skipping project creation.`,
				);
			}
			return existsOnDisk;
		}),
	);
	projectDefinitions = projectDefinitions.filter(
		(_, index) => definitionsOnDisk[index],
	);

	// Filter out project definitions for which the configuration file does not
	// exist if they require one.
	const definitionsWithConfigFileIfRequired = await Promise.all(
		projectDefinitions.map(async (definition) => {
			const configFileExists = await configFileExistsIfRequired(
				folder,
				definition,
			);

			if (!configFileExists) {
				warn(
					`Project ${Uri.joinPath(folder.uri, definition.path)} requires a configuration file that does not exist, skipping project creation.`,
				);
			}

			return configFileExists;
		}),
	);
	projectDefinitions = projectDefinitions.filter(
		(_, index) => definitionsWithConfigFileIfRequired[index],
	);

	// At this point, we have a list of project definitions that are valid and
	// can be created, so we create projects for them.
	const projects: Project[] = [];
	for (const projectDefinition of projectDefinitions) {
		const fullPath = Uri.joinPath(folder.uri, projectDefinition.path);

		const configFileURI = projectDefinition.configFile
			? Uri.joinPath(folder.uri, projectDefinition.configFile)
			: undefined;

		projects.push(
			await createProject({
				folder: folder,
				path: fullPath,
				configFile: configFileURI,
			}),
		);
	}

	return projects;
};

/**
 * Updates the currently active project
 *
 * This function updates the currently active project based on the active text
 * editor by checking if the document in the active text editor is part of a
 * project. If it is, the active project is updated to reflect this change.
 */
export const updateActiveProject = (editor: TextEditor) => {
	const project = [...state.sessions.keys()].find((project) => {
		return editor?.document?.uri.fsPath.startsWith(project.path.fsPath);
	});

	state.hidden =
		editor?.document === undefined ||
		!supportedLanguages.includes(editor.document.languageId);

	state.activeProject = project;
};
