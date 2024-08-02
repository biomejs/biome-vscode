import { Uri, type WorkspaceFolder, window, workspace } from "vscode";
import { Utils } from "vscode-uri";
import { findBiomeLocally } from "./binary-finder";
import { error, info, warn } from "./logger";
import { config, directoryExists, fileExists, mode } from "./utils";

export type Project = {
	folder?: WorkspaceFolder;
	path: Uri;
	configFile?: Uri;
	bin: Uri;
};

export type ProjectConfig = {
	folder?: string;
	path?: string;
	configFile?: string;
};

export const createProjects = async () => {
	info("=== Creating projects ===");
	return mode === "single-file"
		? [await createSingleFileProject()]
		: await createWorkspaceProjects();
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

	if (!singleFileURI) {
		return;
	}

	const parentFolderURI = Uri.parse(
		Utils.resolvePath(singleFileURI, "..").fsPath,
	);

	info(
		`Creating project for single file at ${singleFileURI.fsPath} in parent folder ${parentFolderURI.fsPath}`,
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

const createWorkspaceFolderProjects = async (folder: WorkspaceFolder) => {
	if (!config("enabled", { default: true, level: "workspaceFolder" })) {
		info(
			`Biome is disabled (by config) in workspace folder ${folder.name}. Skipping project creation.`,
		);
		return [];
	}

	info(`Creating projects for workspace folder ${folder.name}`);

	const projects: Project[] = [];

	// Retrieve the list of explicitly declared project definitions in the
	// workspace folder's configuration.
	const x = config<ProjectConfig[]>("projects", {
		scope: folder.uri,
		default: [],
	});

	const projectConfigs = x.filter((project) => {
		if (!project.folder) {
			return true;
		}

		return project.folder === folder.name;
	});

	// If there are no project definitions in the configuration, we create
	// a single project for the workspace folder itself.
	if ((projectConfigs ?? []).length === 0) {
		info(
			`No project definitions found in workspace folder ${folder.name}, creating project for workspace folder itself`,
		);

		if (
			!(await configFileExistsIfRequired(folder, {
				path: folder.uri.fsPath,
			}))
		) {
			warn(
				`Project ${folder.uri.fsPath} requires a configuration file that does not exist, skipping project creation`,
			);
		} else {
			projects.push(
				await createProject({
					folder,
					path: folder.uri,
					configFile: undefined,
				}),
			);
		}
	}

	info("Creating projects.");

	// If there are project definitions in the configuration, we create a
	// project for each of them, but we'll igore projects that point to
	// non-existent directories on the filesystem, as well as projects
	// that do not have an associated configuration file (if required).
	for (const projectConfig of projectConfigs) {
		const fullPath = Uri.joinPath(folder.uri, projectConfig.path);

		if (!(await directoryExists(fullPath))) {
			warn(
				`Project directory ${fullPath.fsPath} does not exist on disk, skipping project creation`,
			);
			continue;
		}

		const configFileURI = projectConfig.configFile
			? Uri.joinPath(folder.uri, projectConfig.configFile)
			: undefined;

		if (!(await configFileExistsIfRequired(folder, projectConfig))) {
			warn(
				`Project ${fullPath.fsPath} requires a configuration file that does not exist, skipping project creation`,
			);
			continue;
		}

		projects.push(
			await createProject({
				folder: folder,
				path: fullPath,
				configFile: configFileURI,
			}),
		);

		info(
			`Created project for directory ${fullPath.fsPath} in workspace folder ${folder.name}`,
		);
	}

	return projects;
};

const configFileExistsIfRequired = async (
	folder: WorkspaceFolder,
	project: ProjectConfig,
): Promise<boolean> => {
	const requireConfig = config("requireConfigFile", {
		default: false,
		scope: Uri.joinPath(folder.uri, project.path),
	});

	if (!requireConfig) {
		info("Project does not require a configuration file.");
		return true;
	}

	info("Project requires a configuration file.");

	const acceptedConfigFiles = [
		...(project.configFile
			? [Uri.joinPath(folder.uri, project.path, project.configFile)]
			: []),
		Uri.joinPath(folder.uri, project.path, "biome.json"),
		Uri.joinPath(folder.uri, project.path, "biome.jsonc"),
	];

	let configFileExists = false;
	info("Checking for existence of configuration files");
	for (const configFile of acceptedConfigFiles) {
		info(`Checking for existence of ${configFile.fsPath}`);
		if (await fileExists(configFile)) {
			info(`Found ${configFile.fsPath}. Configuration file exists.`);
			configFileExists = true;
			break;
		}
	}

	if (!configFileExists) {
		warn("No configuration file found.");
	}

	return configFileExists;
};
