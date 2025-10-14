import { type Diagnostic, Uri, type WorkspaceFolder, window } from "vscode";
import {
	type DocumentFilter,
	type InitializeParams,
	LanguageClient,
	type LanguageClientOptions,
	type Middleware,
	type PublishDiagnosticsParams,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { displayName } from "../package.json";
import type Biome from "./biome";
import { supportedLanguages } from "./constants";
import { config } from "./utils";

export default class Session {
	/**
	 * The language client for this session.
	 */
	private client: LanguageClient | undefined;

	public get biomeVersion(): string | undefined {
		return this.client?.initializeResult?.serverInfo?.version;
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

		const serverOptions: ServerOptions = {
			command: this.bin.fsPath,
			transport: TransportKind.stdio,
			args: ["lsp-proxy"],
		};

		const outputChannel = window.createOutputChannel(
			`${displayName} (${this.folder?.name ?? "global"}) - LSP`,
			{ log: true },
		);

		const middleware: Middleware = {
			handleDiagnostics: async (uri: Uri, diagnostics: Diagnostic[], next) => {
				// Check if requireConfiguration is enabled
				if (
					config("requireConfiguration", { scope: this.folder, default: false })
				) {
					// Check if this file has a configuration file in its parent directories
					const hasConfig = await this.biome.findNearestConfigurationFile(uri);
					if (!hasConfig) {
						// No configuration found, suppress diagnostics
						return;
					}
				}
				// Configuration found or requireConfiguration is disabled, show diagnostics
				next(uri, diagnostics);
			},
			provideDocumentFormattingEdits: async (
				document,
				options,
				token,
				next,
			) => {
				// Check if requireConfiguration is enabled
				if (
					config("requireConfiguration", { scope: this.folder, default: false })
				) {
					// Check if this file has a configuration file in its parent directories
					const hasConfig = await this.biome.findNearestConfigurationFile(
						document.uri,
					);
					if (!hasConfig) {
						// No configuration found, don't format
						return [];
					}
				}
				// Configuration found or requireConfiguration is disabled, proceed with formatting
				return next(document, options, token);
			},
			provideDocumentRangeFormattingEdits: async (
				document,
				range,
				options,
				token,
				next,
			) => {
				// Check if requireConfiguration is enabled
				if (
					config("requireConfiguration", { scope: this.folder, default: false })
				) {
					// Check if this file has a configuration file in its parent directories
					const hasConfig = await this.biome.findNearestConfigurationFile(
						document.uri,
					);
					if (!hasConfig) {
						// No configuration found, don't format
						return [];
					}
				}
				// Configuration found or requireConfiguration is disabled, proceed with formatting
				return next(document, range, options, token);
			},
			provideCodeActions: async (document, range, context, token, next) => {
				// Check if requireConfiguration is enabled
				if (
					config("requireConfiguration", { scope: this.folder, default: false })
				) {
					// Check if this file has a configuration file in its parent directories
					const hasConfig = await this.biome.findNearestConfigurationFile(
						document.uri,
					);
					if (!hasConfig) {
						// No configuration found, don't provide code actions
						return [];
					}
				}
				// Configuration found or requireConfiguration is disabled, proceed with code actions
				return next(document, range, context, token);
			},
		};

		const clientOptions: LanguageClientOptions = {
			outputChannel: outputChannel,
			traceOutputChannel: outputChannel,
			documentSelector: this.createDocumentSelector(),
			workspaceFolder: this.folder,
			initializationOptions: {
				...(this.singleFileFolder && {
					rootUri: this.singleFileFolder,
				}),
			},
			middleware,
		};

		return new BiomeLanguageClient(
			"biome.lsp",
			"biome",
			serverOptions,
			clientOptions,
			this.biome,
		);
	}

	/**
	 * Creates the document selector for the language client.
	 */
	private createDocumentSelector(): DocumentFilter[] {
		const folder = this.folder;
		const singleFileFolder = this.singleFileFolder;

		if (folder !== undefined) {
			return supportedLanguages.map((language) => ({
				language,
				scheme: "file",
				pattern: Uri.joinPath(folder.uri, "**", "*").fsPath.replaceAll(
					"\\",
					"/",
				),
			}));
		} else if (singleFileFolder !== undefined) {
			return supportedLanguages.map((language) => ({
				language,
				scheme: "file",
				pattern: Uri.joinPath(singleFileFolder, "**", "*").fsPath.replaceAll(
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
	constructor(
		id: string,
		name: string,
		serverOptions: ServerOptions,
		clientOptions: LanguageClientOptions,
		private readonly biome: Biome,
	) {
		super(id, name, serverOptions, clientOptions);
	}

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
