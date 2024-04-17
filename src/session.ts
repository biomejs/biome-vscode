import {
	type Disposable,
	type ExtensionContext,
	commands,
	window,
} from "vscode";
import type { LanguageClient } from "vscode-languageclient/node";
import type { Commands } from "./commands";
import { type BiomeEditor, isBiomeEditor } from "./utils";

export type Command = (...args: unknown[]) => unknown;

/**
 * Client session of the LSP
 */
export class Session {
	context: ExtensionContext;
	client: LanguageClient;

	constructor(context: ExtensionContext, client: LanguageClient) {
		this.context = context;
		this.client = client;
	}

	registerCommand(name: Commands, factory: Command) {
		const disposable = commands.registerCommand(name, factory);
		this.context.subscriptions.push(disposable);
	}

	get subscriptions(): Disposable[] {
		return this.context.subscriptions;
	}

	get editor(): BiomeEditor | undefined {
		const editor = window.activeTextEditor;
		return editor && isBiomeEditor(editor) ? editor : undefined;
	}
}
