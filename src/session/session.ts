import { EventEmitter } from "node:events";
import {
	type LogOutputChannel,
	type Uri,
	type WorkspaceFolder,
	window,
} from "vscode";
import {
	type DocumentSelector,
	LanguageClient,
	type LanguageClientOptions,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { lspLogger } from "../logger";

export class Session extends EventEmitter {
	/**
	 * The language client for the session
	 */
	private client: LanguageClient | undefined;

	/**
	 * The logger for the session
	 */
	private lspTraceLogger: LogOutputChannel;

	/**
	 * Instantiates a new session
	 */
	constructor(
		private readonly workspaceFolder: WorkspaceFolder,
		private readonly biomeBinaryPath: Uri,
	) {
		super();

		this.lspTraceLogger = window.createOutputChannel(
			`Biome LSP trace / ${workspaceFolder.name}`,
			{
				log: true,
			},
		);
	}

	/**
	 * Starts the LSP session
	 */
	public async start() {
		if (this.client === undefined) {
			this.createLanguageClient();
		}

		await this.client.start();

		this.client.onDidChangeState((event) => {
			this.emit("stateChanged", event.newState);
		});
	}

	/**
	 * Stops the LSP session
	 */
	public async stop() {
		if (this.client?.isRunning) {
			await this.client?.stop();
		}
	}

	/**
	 * Destroys the LSP session
	 */
	public async destroy() {
		if (this.client?.isRunning) {
			await this.client?.stop();
			this.client?.dispose();
		}
		this.removeAllListeners();
	}

	private createLanguageClient() {
		const serverOptions: ServerOptions = {
			command: this.biomeBinaryPath.fsPath,
			transport: TransportKind.stdio,
			args: ["lsp-proxy"],
		};

		const clientOptions: LanguageClientOptions = {
			outputChannel: lspLogger,
			traceOutputChannel: this.lspTraceLogger,
			documentSelector: this.generateDocumentSelector(),
		};

		this.client = new LanguageClient("biome_lsp", serverOptions, clientOptions);
	}

	/**
	 * Generates a document selector for the LSP session
	 *
	 * This function generates a document selector that matches all files supported by Biome within
	 * the workspace folder.
	 */
	private generateDocumentSelector(): DocumentSelector {
		return [
			"javascript",
			"typescript",
			"javascriptreact",
			"typescriptreact",
			"json",
			"jsonc",
			"astro",
			"vue",
			"svelte",
			"css",
		].map((language) => ({
			language,
			scheme: "file",
			pattern: `${this.workspaceFolder.uri.fsPath}/**/*`,
		}));
	}
}
