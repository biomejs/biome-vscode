import { Uri, window, workspace } from "vscode";
import { findBiomeGlobally, findBiomeLocally } from "./locator/locator";
import { Root } from "./root";
import { Session } from "./session";
import { state } from "./state";
import { config, logger } from "./utils";

export class Orchestrator {
	/**
	 * The LSP sessions managed by the orchestrator.
	 */
	private sessions: Map<Root, Session> = new Map([]);

	/**
	 * Initializes the orchestrator.
	 */
	async init() {
		await this.start();
	}

	/**
	 * Starts the orchestrator.
	 *
	 * This method starts the orchestrator and creates a new session for each
	 * Biome root found in each workspace folder.
	 */
	async start() {
		state.state = "starting";
		logger.debug("Starting Biome LSP sessions.");
		const roots = await this.detectBiomeRoots();

		// Create a new session for each root
		for (const root of roots) {
			const biome =
				state.context === "single-file"
					? await findBiomeGlobally()
					: await findBiomeLocally(root.uri);
			const session = new Session(biome.uri, root);
			this.sessions.set(root, session);
		}

		// Start all sessions
		for (const session of this.sessions.values()) {
			await session.start();
		}

		state.state = "started";
		logger.debug(
			"Biome LSP sessions started.",
			[...this.sessions.keys()].length,
		);
	}

	/**
	 * Stops the orchestrator.
	 *
	 * This method stops the orchestrator and destroys all the sessions.
	 */
	async stop() {
		state.state = "stopping";

		// Destroy all sessions
		for (const session of this.sessions.values()) {
			await session.destroy();
		}

		// Clear the sessions map
		this.sessions.clear();

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
	public async detectBiomeRoots(): Promise<Root[]> {
		// If we operate in a single-file context, we create a single root whose
		// URI is the parent directory of the file.
		if (state.context === "single-file") {
			logger.debug("Detecting Biome root for single file context.");
			const uri = window.activeTextEditor?.document.uri;
			return uri ? [new Root(uri)] : [];
		}

		// If we operate in a workspace context, we loop over all workspace folders
		// and check if they have explicitly declared roots in their configuration.
		// If they have, we use those, otherwise we use the workspace folder itself
		// as a the root.
		logger.debug(
			"Detecting Biome roots for workspace context.",
			workspace.workspaceFolders.map((folder) => folder.uri.fsPath),
		);
		const allRoots = [];
		for (const folder of workspace.workspaceFolders || []) {
			const configRoots = config<{ uri: string; configFile: string }[]>(
				"roots",
				{ scope: folder.uri },
			);

			// If no roots are defined, we create a root using
			// the workspace folder
			if (configRoots.length === 0) {
				configRoots.push({
					uri: folder.uri.fsPath,
					configFile: Uri.joinPath(
						folder.uri,
						config("configFile", {
							scope: folder.uri,
							default: "biome.json",
						}),
					).fsPath,
				});
			}

			const roots = configRoots
				.map((rootDefinition) => {
					return new Root(
						Uri.joinPath(folder.uri, rootDefinition.uri),
						Uri.joinPath(folder.uri, rootDefinition.configFile),
					);
				})
				.filter(async (root) => {
					// Users may have specified roots that don't actually exist
					// on disk, so we'll filter them out just to be safe.
					return await root.existsOnDisk();
				});

			allRoots.push(...roots);
		}

		return allRoots;
	}
}
