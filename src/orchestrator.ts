import { type Uri, type WorkspaceFolder, window, workspace } from "vscode";
import { Utils } from "vscode-uri";
import { Root } from "./root";
import { Session } from "./session";
import { state } from "./state";
import { config, logger } from "./utils";

export class Orchestrator {
	/**
	 * The Biome roots currently being tracked by the orchestrator.
	 */
	private roots: Root[] = [];

	/**
	 * Initializes the orchestrator.
	 */
	async init() {
		logger.debug("Initializing Biome LSP orchestrator.");

		await this.start();

		logger.debug("Biome LSP orchestrator initialized.");
	}

	/**
	 * Starts the orchestrator.
	 *
	 * This method starts the orchestrator and creates a new session for each
	 * Biome root found in each workspace folder.
	 */
	async start() {
		state.state = "starting";

		logger.debug("Detecting Biome roots.");
		const detectedRoots = await this.detectBiomeRoots();

		logger.debug(
			`Detected ${detectedRoots.length} Biome roots:`,
			detectedRoots,
		);

		// Create a new Root instance for each detected root
		for (const rootDefinition of detectedRoots) {
			this.roots.push(
				new Root({
					uri: rootDefinition.uri,
					workspaceFolder: rootDefinition.workspaceFolder,
					configFile: rootDefinition.configFile,
				}),
			);
		}

		// Initialize all roots
		logger.debug("Initializing Biome roots.");
		for (const root of this.roots) {
			await root.init();
		}

		state.state = "started";
	}

	/**
	 * Stops the orchestrator.
	 *
	 * This method stops the orchestrator and destroys all the sessions.
	 */
	async stop() {
		state.state = "stopping";

		// Destroy all roots
		for (const root of this.roots) {
			await root.destroy();
		}

		// Clear the sessions map
		this.roots = [];

		state.state = "stopped";
	}

	/**
	 * Restarts the orchestrator.
	 *
	 * This method restarts the orchestrator, destroying all sessions and then
	 * recreating them.
	 */
	async restart() {
		await this.stop();
		await this.start();
	}

	/**
	 * Detects Biome roots
	 *
	 * This method will detect all the Biome roots in the workspace.
	 */
	public async detectBiomeRoots(): Promise<
		{ uri: Uri; configFile?: Uri; workspaceFolder?: WorkspaceFolder }[]
	> {
		// If we operate in a single-file context, we create a single root whose
		// URI is the parent directory of the file.
		if (state.context === "single-file") {
			const uri = window.activeTextEditor?.document.uri;
			return uri
				? [
						{
							uri: Utils.resolvePath(uri, ".."),
							// configFile: config("configFile", { scope: uri }),
						},
					]
				: [];
		}

		// If we operate in a workspace context, we loop over all workspace folders
		// and check if they have explicitly declared roots in their configuration.
		// If they have, we use those, otherwise we use the workspace folder itself
		// as a the root.

		const allRoots = [];
		for (const folder of workspace.workspaceFolders || []) {
			const roots = config<
				{
					uri: string;
					configFile?: string;
					workspaceFolder?: WorkspaceFolder;
				}[]
			>("roots", { scope: folder.uri });

			// If no roots are defined, we create a root using
			// the workspace folder
			if (roots.length === 0) {
				logger.debug(
					`No roots defined for workspace folder ${folder.uri.fsPath}.`,
				);
				roots.push({
					uri: folder.uri.fsPath,
					workspaceFolder: folder,
				});
			}

			allRoots.push(...roots);
		}

		return allRoots;
	}
}
