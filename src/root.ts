import type { Uri, WorkspaceFolder } from "vscode";
import { directoryExists } from "./utils";

export class Root {
	/**
	 * Create a new Biome root.
	 *
	 * @param uri The URI of the Biome root's directory.
	 */
	constructor(
		private readonly options: {
			uri: Uri;
			workspaceFolder?: WorkspaceFolder;
			configFile?: Uri;
		},
	) {}

	public get uri() {
		return this.options.uri;
	}

	public get workspaceFolder() {
		return this.options?.workspaceFolder;
	}

	public get configFile() {
		return this.options.configFile;
	}

	/**
	 * Whether the root exists on disk.
	 */
	public async existsOnDisk() {
		return await directoryExists(this.uri);
	}
}
