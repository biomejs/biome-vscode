import {
	RelativePattern,
	type Uri,
	type WorkspaceFolder,
	workspace,
} from "vscode";
import { Utils } from "vscode-uri";
import { findBiomeLocally } from "./locator/locator";
import { Session } from "./session";
import { directoryExists, logger } from "./utils";

export class Root {
	/**
	 * Biome LSP session for this root.
	 */
	public session: Session;

	/**
	 * The URI of the original Biome binary for this root.
	 *
	 * This is the Biome binary that was found when the root was initialized.
	 * When the extension finds the binary, it creates a temporary copy of it
	 * so that the original binary is not locked by the extension. This allows
	 * users to update the binary without restarting the extension.
	 *
	 * The extension listens for changes to the original binary creates a new
	 * copy and restarts the LSP session when it happens.
	 */
	private originalBin?: Uri;

	/**
	 * The URI of the Biome binary for this root.
	 */
	private bin?: Uri;

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

	/**
	 * Initialize the Biome root
	 */
	public async init(): Promise<void> {
		// Find the Biome binary in for the root
		logger.debug(`Finding Biome binary for root: ${this.uri}`);

		this.originalBin = (await findBiomeLocally(this.uri)).uri;
		logger.debug(`Found Biome binary at: ${this.originalBin}`);

		// Create a new session for the root
		this.session = new Session(this);

		// Start the session
		await this.session.start();

		// Register a watcher for the path of the original binary so that we
		// can restart the session when the binary is updated.
		logger.debug(
			"Registering watcher for Biome binary at",
			this.originalBin,
		);
		const pattern = new RelativePattern(this.uri, "*lock*");
		const watcher = workspace.createFileSystemWatcher(pattern);

		watcher.onDidChange(() => {
			logger.debug(
				"Biome binary updated, restarting session",
				this.uri.fsPath,
			);

			// Restart the session
			this.session.restart();
		});

		logger.debug("Watcher registered", watcher);
	}

	public async destroy() {
		// Stop the session
		await this.session.destroy();
		this.session = undefined;

		// Delete the temporary binary
		// if (this.bin) {
		// 	workspace.fs.delete(this.bin);
		// }
	}

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
