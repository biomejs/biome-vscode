import type { Uri } from "vscode";
import { findBiomeLocally } from "./locator/locator";
import { Session } from "./session";

/**
 * Biome Root
 *
 * A Biome root is a location on the filesystem for which the extension will
 * track and maintain a Biome LSP session. Every Biome root receives its own
 * and independent LSP session, which means that the extension can handle
 * setups such as monorepos that do not share a single Biome dependency.
 */
export class Root {
	/**
	 * The Biome LSP session associated with this root.
	 */
	private session: Session | undefined;

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
	 * Start a new Biome LSP session for the root.
	 */
	async startSession() {
		const biome = await findBiomeLocally(this.uri);
		this.session = new Session(biome.uri, this);
		this.session.start();
	}

	/**
	 * Stop the Biome LSP session for the root.
	 */
	async stopSession() {
		this.session?.destroy();
	}

	/**
	 * Restart the Biome LSP session for the root.
	 */
	async restartSession() {
		await this.stopSession();
		await this.startSession();
	}
}
