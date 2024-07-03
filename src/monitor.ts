import { Uri } from "vscode";
import { Root } from "./root";
import { config, directoryExists } from "./utils";

/**
 * Monitor
 *
 * The monitor listens for changes in the settings and workspace configuration
 * and emits events that the orchestrator relies on to make decisions.
 */
export class Monitor {
	/**
	 * The currently active Biome root
	 */
	private _activeRoot: Root | null = null;

	/**
	 * The currently active Biome root
	 */
	get activeRoot(): Root | null {
		return this._activeRoot;
	}

	/**
	 * Initialize the monitor
	 */
	public async init() {}

	public async getRoots(): Promise<Root[]> {
		const roots =
			(await this.getRootsFromConfig()) ?? (await this.discoverRoots());

		return roots
			.filter(async (uri) => {
				const exists = await directoryExists(uri);
				// Warn if the root does not exist
				return exists;
			})
			.map((uri) => {
				return new Root(uri);
			});
	}

	/**
	 * Retrieves the roots of the project from the configuration
	 */
	private async getRootsFromConfig(): Promise<Uri[] | undefined> {
		const roots = config<string[]>("roots");

		if (!roots) {
			return;
		}

		return roots.map((root) => Uri.file(root));
	}

	/**
	 * Discovers the roots of the project
	 */
	private async discoverRoots(): Promise<Uri[] | undefined> {
		return [];
	}
}
