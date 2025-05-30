import picomatch from "picomatch";
import {
	type Diagnostic,
	DiagnosticSeverity,
	Uri,
	type WorkspaceFolder,
	window,
} from "vscode";
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
import { config } from "./utils";

interface RuleCustomization {
	rule: string;
	severity: "off" | "warn" | "error";
}

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
	 * Restarts the LSP session.
	 */
	public async restart() {
		await this.stop();
		await this.start();
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
			middleware: {
				handleDiagnostics: (uri, diagnostics, next) => {
					this.biome.logger.debug(
						`Received ${diagnostics.length} diagnostics for ${uri.toString()}: ${JSON.stringify(diagnostics)}`,
					);

					const customizations = config<RuleCustomization[]>("customizations", {
						default: [],
						scope: this.folder,
					});

					this.biome.logger.debug(
						`loaded ${customizations.length} customizations for diagnostics: ${JSON.stringify(customizations)}`,
					);

					const modifiedDiagnostics = this.applyRuleCustomizations(
						diagnostics,
						customizations,
					);

					this.biome.logger.debug(
						`Modified diagnostics: ${JSON.stringify(modifiedDiagnostics)}`,
					);

					next(uri, modifiedDiagnostics);
				},
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

	private applyRuleCustomizations(
		diagnostics: Diagnostic[],
		customizations: RuleCustomization[],
	): Diagnostic[] {
		if (customizations.length === 0) {
			return diagnostics;
		}

		return diagnostics
			.map((diagnostic): Diagnostic | null => {
				for (const customization of customizations) {
					if (this.matchesRule(diagnostic, customization.rule)) {
						switch (customization.severity) {
							case "off":
								return null;
							case "warn":
								diagnostic.severity = DiagnosticSeverity.Warning;
								break;
							case "error":
								diagnostic.severity = DiagnosticSeverity.Error;
								break;
						}
						break;
					}
				}

				return diagnostic;
			})
			.filter((diagnostic): diagnostic is Diagnostic => diagnostic !== null);
	}

	private matchesRule(diagnostic: Diagnostic, rulePattern: string): boolean {
		const isMatch = picomatch(rulePattern);
		const ruleCode = diagnostic.code;

		if (typeof ruleCode === "string" || typeof ruleCode === "number") {
			const result = isMatch(ruleCode.toString(), true);

			if (result.match) {
				return true;
			}
		}

		if (typeof ruleCode === "object") {
			const result = isMatch(ruleCode.value.toString(), true);

			if (result.match) {
				return true;
			}
		}

		return false;
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
