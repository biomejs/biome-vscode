import { type Uri, window, workspace } from "vscode";
import { Utils } from "vscode-uri";
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

		const detectedRoots = await this.detectBiomeRoots();

		// Create a new Root instance for each detected root
		for (const rootDefinition of detectedRoots) {
			const root = new Root(rootDefinition);
			this.sessions.set(root, new Session(root));
		}

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
	public async detectBiomeRoots(): Promise<{ uri: Uri; configFile?: Uri }[]> {
		// If we operate in a single-file context, we create a single root whose
		// URI is the parent directory of the file.
		if (state.context === "single-file") {
			logger.debug("Detecting Biome root for single file context.");
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
		logger.debug(
			"Detecting Biome roots for workspace context.",
			workspace.workspaceFolders.map((folder) => folder.uri.fsPath),
		);

		const allRoots = [];
		for (const folder of workspace.workspaceFolders || []) {
			const roots = config<{ uri: string; configFile?: string }[]>(
				"roots",
				{ scope: folder.uri },
			);

			// If no roots are defined, we create a root using
			// the workspace folder
			if (roots.length === 0) {
				roots.push({
					uri: folder.uri.fsPath,
				});
			}

			allRoots.push(...roots);
		}

		return allRoots;
	}
}
