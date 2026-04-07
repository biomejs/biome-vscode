import { Uri, type WorkspaceFolder, window } from "vscode";
import {
	type DocumentFilter,
	type InitializeParams,
	LanguageClient,
	type LanguageClientOptions,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { displayName } from "../package.json";
import type Biome from "./biome";
import { supportedLanguages } from "./constants";
import {
	config,
	normalizeBiomeSettings,
	type SafeSpawnSyncOptions,
	safeSpawnSync,
} from "./utils";

export default class Session {
	private static watcherSupportCache = new Map<
		string,
		{ versionString?: string; supportsWatcherArgs: boolean }
	>();

	/**
	 * The language client for this session.
	 */
	private client: LanguageClient | undefined;

	public get selectorRoot(): Uri | undefined {
		return this.folder?.uri ?? this.singleFileFolder;
	}

	public get biomeVersion(): string | undefined {
		return this.client?.initializeResult?.serverInfo?.version;
	}

	/**
	 * Clears the watcher support cache.
	 */
	public static clearCache() {
		Session.watcherSupportCache.clear();
	}

	/**
	 * Creates a new LSP session
	 */
	public constructor(
		private readonly biome: Biome,
		public readonly bin: Uri,
		private readonly folder?: WorkspaceFolder,
		private readonly singleFileFolder?: Uri,
	) {}

	public static createForWorkspaceFolder(
		biome: Biome,
		bin: Uri,
		workspaceFolder: WorkspaceFolder,
	): Session {
		return new Session(biome, bin, workspaceFolder);
	}

	public static createForSingleFile(
		biome: Biome,
		bin: Uri,
		singleFileFolder: Uri,
	): Session {
		return new Session(biome, bin, undefined, singleFileFolder);
	}

	public static createForGlobalInstance(biome: Biome, bin: Uri): Session {
		return new Session(biome, bin);
	}

	/**
	 * Starts the LSP session.
	 */
	public async start() {
		this.client = this.createLanguageClient();
		await this.client.start();
	}

	/**
	 * Stops the LSP session.
	 */
	public async stop() {
		this.biome.logger.debug("Stopping LSP session");

		await this.client?.stop();

		this.biome.logger.debug("LSP session stopped");

		this.client = undefined;
	}

	/**
	 * Creates a new language client for the session.
	 */
	private createLanguageClient(): LanguageClient {
		this.biome.logger.debug(
			`Creating LSP session for ${this.folder?.name ?? "global"} with ${this.bin.fsPath}`,
		);

		const args: string[] = ["lsp-proxy"];

		let versionString: string | undefined;
		let supportsWatcherArgs = false;

		const cached = Session.watcherSupportCache.get(this.bin.fsPath);
		if (cached) {
			versionString = cached.versionString;
			supportsWatcherArgs = cached.supportsWatcherArgs;
		} else {
			const spawnSyncOptions: SafeSpawnSyncOptions = {};
			if (this.folder?.uri) {
				spawnSyncOptions.cwd = this.folder.uri.fsPath;
			}

			const versionOutput = safeSpawnSync(
				this.bin.fsPath,
				["--version"],
				spawnSyncOptions,
			);
			versionString = versionOutput?.split("Version: ")[1]?.trim();

			if (versionString) {
				const match = versionString.match(
					/^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?/,
				);
				if (match) {
					const major = parseInt(match[1], 10);
					const minor = parseInt(match[2], 10);
					supportsWatcherArgs = major > 2 || (major === 2 && minor >= 4);
				}
			}
			Session.watcherSupportCache.set(this.bin.fsPath, {
				versionString,
				supportsWatcherArgs,
			});
		}

		const watcherKind = config<string | null>("lsp.watcher.kind", {
			scope: this.folder,
			default: null,
		});

		const watcherPollingInterval = config<number | null>(
			"lsp.watcher.pollingInterval",
			{
				scope: this.folder,
				default: null,
			},
		);

		if (supportsWatcherArgs) {
			const WATCHER_KIND_DEFAULT = "recommended";
			const WATCHER_POLLING_INTERVAL_DEFAULT = 2000;

			this.biome.logger.debug(
				`File watcher kind: "${watcherKind ?? process.env.BIOME_WATCHER_KIND ?? WATCHER_KIND_DEFAULT}"`,
			);

			if (watcherKind && watcherKind !== WATCHER_KIND_DEFAULT) {
				args.push("--watcher-kind", watcherKind);

				if (watcherKind === "polling") {
					this.biome.logger.debug(
						`File watcher polling interval: ${watcherPollingInterval ?? process.env.BIOME_WATCHER_POLLING_INTERVAL ?? WATCHER_POLLING_INTERVAL_DEFAULT}`,
					);

					if (
						watcherPollingInterval &&
						watcherPollingInterval !== WATCHER_POLLING_INTERVAL_DEFAULT
					) {
						args.push(
							"--watcher-polling-interval",
							watcherPollingInterval.toString(),
						);
					}
				}
			}
		} else if (watcherKind || watcherPollingInterval) {
			this.biome.logger.warn(
				"File watcher settings ignored: Biome version 2.4.0 or higher is required. " +
					`Detected version: ${versionString ?? "unknown"} ("${this.bin.fsPath}").`,
			);
		}

		const serverOptions: ServerOptions = {
			command: this.bin.fsPath,
			transport: TransportKind.stdio,
			args,
		};

		const outputChannel = window.createOutputChannel(
			`${displayName} (${this.folder?.name ?? "global"}) - LSP`,
			{ log: true },
		);

		const clientOptions: LanguageClientOptions = {
			outputChannel: outputChannel,
			traceOutputChannel: outputChannel,
			documentSelector: this.createDocumentSelector(),
			workspaceFolder: this.folder,
			middleware: {
				workspace: {
					configuration: async (params, token, next) => {
						const settings = await next(params, token);

						if (!Array.isArray(settings)) {
							return settings;
						}

						return params.items.map((item, index) => {
							const resource = item.scopeUri
								? Uri.parse(item.scopeUri)
								: undefined;
							const value = settings[index];

							if (item.section === "biome") {
								return normalizeBiomeSettings(value, resource);
							}

							if (
								item.section === "biome.configurationPath" &&
								typeof value === "string"
							) {
								return (
									normalizeBiomeSettings(
										{ configurationPath: value },
										resource,
									) as { configurationPath?: string }
								).configurationPath;
							}

							if (
								(item.section === "biome.lsp.bin" ||
									item.section === "biome.lspBin") &&
								(typeof value === "string" ||
									(typeof value === "object" &&
										value !== null &&
										!Array.isArray(value)))
							) {
								if (item.section === "biome.lspBin") {
									return (
										normalizeBiomeSettings({ lspBin: value }, resource) as {
											lspBin?: unknown;
										}
									).lspBin;
								}

								return (
									normalizeBiomeSettings({ lsp: { bin: value } }, resource) as {
										lsp?: { bin?: unknown };
									}
								).lsp?.bin;
							}

							if (
								(item.section === undefined || item.section === null) &&
								typeof value === "object" &&
								value !== null &&
								!Array.isArray(value) &&
								"biome" in value
							) {
								return {
									...(value as Record<string, unknown>),
									biome: normalizeBiomeSettings(
										(value as Record<string, unknown>).biome,
										resource,
									),
								};
							}

							return value;
						});
					},
				},
			},
			initializationOptions: {
				...(this.singleFileFolder && {
					rootUri: this.singleFileFolder,
				}),
			},
		};

		return new BiomeLanguageClient(
			"biome.lsp",
			"biome",
			serverOptions,
			clientOptions,
		);
	}

	/**
	 * Creates the document selector for the language client.
	 */
	private createDocumentSelector(): DocumentFilter[] {
		const selectorRoot = this.selectorRoot;

		if (selectorRoot !== undefined) {
			return supportedLanguages.map((language) => ({
				language,
				scheme: "file",
				pattern: Uri.joinPath(selectorRoot, "**", "*").fsPath.replaceAll(
					"\\",
					"/",
				),
			}));
		}

		return supportedLanguages.flatMap((language) => {
			return ["untitled", "vscode-userdata"].map((scheme) => ({
				language,
				scheme,
			}));
		});
	}
}

class BiomeLanguageClient extends LanguageClient {
	protected fillInitializeParams(params: InitializeParams): void {
		super.fillInitializeParams(params);

		if (params.initializationOptions?.rootUri) {
			params.rootUri = params.initializationOptions?.rootUri.toString();
		}

		if (params.initializationOptions?.rootPath) {
			params.rootPath = params.initializationOptions?.rootPath;
		}
	}
}
