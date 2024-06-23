import { EventEmitter } from "node:events";
import { type LogOutputChannel, type Uri, window } from "vscode";
import {
	type DocumentSelector,
	LanguageClient,
	type LanguageClientOptions,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { lspLogger } from "../logger";
import type { Root } from "../root";
import { supportedLanguages } from "../utils";

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
		private readonly bin: Uri,
		private readonly root?: Root,
	) {
		super();

		this.lspTraceLogger = window.createOutputChannel(
			`Biome LSP trace${root.uri}`,
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
			command: this.bin.fsPath,
			transport: TransportKind.stdio,
			args: [
				"lsp-proxy",
				...(this.root?.configPath?.fsPath
					? ["--config-path", this.root.configPath.fsPath]
					: []),
			],
		};

		const clientOptions: LanguageClientOptions = {
			outputChannel: lspLogger,
			traceOutputChannel: this.lspTraceLogger,
			documentSelector: this.generateDocumentSelector(),
		};

		this.client = new LanguageClient("biome", serverOptions, clientOptions);
	}

	/**
	 * Generates a document selector for the LSP session
	 *
	 * This function generates a document selector that matches all files supported by Biome within
	 * the workspace folder.
	 */
	private generateDocumentSelector(): DocumentSelector {
		return supportedLanguages.map((language) => {
			return {
				language,
				scheme: "file",
				...(this.root && {
					pattern: `${this.root.uri.fsPath}/**/*`,
				}),
			};
		});
	}
}
