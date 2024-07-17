import type { Uri } from "vscode";
import { directoryExists } from "./utils";

export class Root {
	/**
	 * Create a new Biome root.
	 *
	 * @param uri The URI of the Biome root's directory.
	 */
	constructor(
		public readonly uri: Uri,
		public readonly configPath?: Uri,
	) {}

	/**
	 * Whether the root exists on disk.
	 */
	public async existsOnDisk() {
		return await directoryExists(this.uri);
	}
}
