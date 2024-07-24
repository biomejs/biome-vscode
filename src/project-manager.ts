import { Uri, type WorkspaceFolder, window, workspace } from "vscode";
import { Utils } from "vscode-uri";
import { Project } from "./project";
import { state } from "./state";
import type { ProjectDefinitionFromConfig } from "./types";
import { config, directoryExists, fileExists } from "./utils";

export class ProjectManager {
	/**
	 * Detects Biome projects
	 *
	 * This method detects configuration-defined Biome projects, and returns
	 * them an an array of project instances. All detected projects that point
	 * to non-existent directories are ignored.
	 */
	public async createProjects(): Promise<Project[]> {
		return state.mode === "single-file"
			? [this.createSingleFileProject()]
			: await this.createWorkspaceProjects();
	}

	/**
	 * Creates a project for a single file
	 *
	 * This method creates a single Biome project for use when VS Code has been
	 * opened in single-file mode (i.e. not in a workspace). The root of the
	 * project is the parent directory of the file, and the resolution of the
	 * configuration file is delegated to the Biome LSP.
	 */
	private createSingleFileProject(): Project | undefined {
		// Retrieve the URI of the document currently present in the active
		// text editor. We need this information to determine the parent
		// directory of the file.
		const singleFileURI = window.activeTextEditor?.document.uri;

		if (!singleFileURI) {
			return;
		}

		return new Project({
			path: Utils.resolvePath(singleFileURI, ".."),
			configFile: config("globalConfigFile"),
		});
	}

	/**
	 * Creates projects for a workspace
	 *
	 * This method will create Biome projects for all project definitions
	 * across all workspace folders in a workspace. This handles single-root
	 * workspaces as well as multi-root workspaces. Each project is free to
	 * use its own custom configuration.
	 */
	private async createWorkspaceProjects(): Promise<Project[]> {
		const projects: Project[] = [];

		for (const folder of workspace.workspaceFolders ?? []) {
			projects.push(
				...(await this.createWorkspaceFolderProjects(folder)),
			);
		}

		return projects;
	}

	/**
	 * Creates projects for a workspace folder
	 *
	 * This method will create Biome projects for all project definitions in a
	 * given workspace folder. This method is used by `createWorkspaceProjects`
	 * to create projects for all workspace folders in a workspace.
	 */
	private async createWorkspaceFolderProjects(
		folder: WorkspaceFolder,
	): Promise<Project[]> {
		const projects: Project[] = [];

		// Retrieve the list of explicitly declared project definitions in the
		// workspace folder's configuration.
		const projectDefinitionsFromConfig = config<
			ProjectDefinitionFromConfig[]
		>("projects", { scope: folder.uri });

		// If there are no project definitions in the configuration, we create
		// a single project for the workspace folder itself.
		if ((projectDefinitionsFromConfig ?? []).length === 0) {
			projects.push(
				new Project({
					folder: folder,
					path: folder.uri,
				}),
			);

			return projects;
		}

		// If there are project definitions in the configuration, we create a
		// project for each of them, but we'll igore projects that point to
		// non-existent directories on the filesystem, as well as projects
		// that do not have an associated configuration file (if required).
		for (const projectDefinition of projectDefinitionsFromConfig) {
			const fullPath = Uri.joinPath(folder.uri, projectDefinition.path);

			if (!(await directoryExists(fullPath))) {
				continue;
			}

			const configFileURI = projectDefinition.configFile
				? Uri.joinPath(folder.uri, projectDefinition.configFile)
				: undefined;

			if (
				!(await this.configFileExistsIfRequired(
					folder,
					projectDefinition,
				))
			) {
				continue;
			}

			projects.push(
				new Project({
					folder: folder,
					path: fullPath,
					configFile: configFileURI,
				}),
			);
		}

		return projects;
	}

	/**
	 * Determines if a configuration file exists if it is required
	 *
	 * If the `requireConfig` setting is enabled for a project, this method,
	 * will check if the configuration file exists in the project directory,
	 * taking into account a possible custom configuration file name.
	 */
	private async configFileExistsIfRequired(
		folder: WorkspaceFolder,
		project: ProjectDefinitionFromConfig,
	): Promise<boolean> {
		const requireConfig = config("requireConfig", {
			default: false,
			scope: Uri.joinPath(folder.uri, project.path),
		});

		if (!requireConfig) {
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

		return !requireConfig || configFileExists;
	}
}
