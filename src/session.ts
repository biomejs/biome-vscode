import { EventEmitter } from "node:events";
import { type LogOutputChannel, type Uri, window } from "vscode";
import { displayName } from "../package.json";

import {
	type DocumentSelector,
	LanguageClient,
	type LanguageClientOptions,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { findBiomeGlobally, findBiomeLocally } from "./locator/locator";
import type { Project } from "./project";
import { subtractURI } from "./utils";
import { supportedLanguages } from "./utils";

export class Session extends EventEmitter {
	/**
	 * The language client for the session
	 */
	private client: LanguageClient | undefined;

	/**
	 * The logger for the session
	 */
	private lspLogger: LogOutputChannel;

	/**
	 * The trace logger for the session
	 */
	private lspTraceLogger: LogOutputChannel;

	/**
	 * The Biome binary for the session
	 */
	private bin: Uri;

	/**
	 * Instantiates a new session
	 */
	constructor(
		/**
		 * The Biome root for the session
		 */
		private readonly root?: Project,
	) {
		super();

		this.lspLogger = window.createOutputChannel(
			root?.workspaceFolder
				? `${displayName} LSP (${root.workspaceFolder.name}::${subtractURI(root.uri, root.workspaceFolder.uri).fsPath})`
				: `${displayName} LSP ${this.isGlobal ? "(global)" : ""}`.trim(),
			{
				log: true,
			},
		);

		this.lspTraceLogger = window.createOutputChannel(
			root?.workspaceFolder
				? `${displayName} LSP trace (${root.workspaceFolder.name}::${subtractURI(root.uri, root.workspaceFolder.uri).fsPath})`
				: `${displayName} LSP trace ${this.isGlobal ? "(global)" : ""}`.trim(),
			{
				log: true,
			},
		);
	}

	/**
	 * Returns whether the session is global
	 */
	public get isGlobal(): boolean {
		return this.root === undefined;
	}

	/**
	 * Starts the LSP session
	 */
	public async start() {
		this.bin = this.root
			? (await findBiomeLocally(this.root.uri)).uri
			: (await findBiomeGlobally()).uri;

		if (this.client === undefined) {
			this.createLanguageClient();
		}

		await this.client.start();

		this.client.onDidChangeState((event) => {
			this.emit("stateChanged", event.newState);
		});
	}

	public async restart() {
		await this.destroy();
		await this.start();
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
				...(this.root?.configFile?.fsPath
					? ["--config-path", this.root.configFile.fsPath]
					: []),
			],
		};

		const clientOptions: LanguageClientOptions = {
			outputChannel: this.lspLogger,
			traceOutputChannel: this.lspTraceLogger,
			documentSelector: this.root
				? this.generateDocumentSelector()
				: this.generateGlobalDocumentSelector(),
		};

		this.client = new LanguageClient(
			"biome.lsp",
			"biome",
			serverOptions,
			clientOptions,
		);
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

	private generateGlobalDocumentSelector(): DocumentSelector {
		return supportedLanguages.map((language) => {
			return {
				language,
				scheme: "untitled",
			};
		});
	}
}
