import type {
	CancellationToken,
	ExtensionContext,
	SemanticTokens,
	TextDocument,
} from "vscode";
import {
	languages,
	SemanticTokensBuilder,
	SemanticTokensLegend,
	window,
} from "vscode";
import type {
	Language as LanguageType,
	Node,
	Parser as ParserType,
} from "web-tree-sitter";
import { Language, Parser } from "web-tree-sitter";
import { mapNodeTypeToSemanticType } from "./node_to_token";

const outputChannel = window.createOutputChannel("GritQL Token Provider");
let gritqlLanguage: LanguageType | null = null;

// Selected semantic tokens for GritQL
// https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#standard-token-types-and-modifiers
const tokenTypes: Map<string, number> = new Map([
	["variable", 0],
	["string", 1],
	["number", 2],
	["keyword", 3],
	["comment", 4],
	["function", 5],
	["parameter", 6],
	["operator", 7],
	["regexp", 8],
]);
const legend = new SemanticTokensLegend(Array.from(tokenTypes.keys()));

interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
}

async function initializeTreeSitter(context: ExtensionContext): Promise<void> {
	try {
		await Parser.init();
		gritqlLanguage = await Language.load(
			`${context.extensionPath}/out/tree-sitter-gritql.wasm`,
		);
		outputChannel.appendLine("Successfully loaded GritQL tree-sitter language");
	} catch (error) {
		outputChannel.appendLine(`Failed to load GritQL tree-sitter: ${error}`);
		throw error;
	}
}

class DocumentSemanticTokensProvider implements DocumentSemanticTokensProvider {
	private parser: ParserType;
	constructor() {
		// Initialize parser synchronously - tree-sitter should be ready by now
		this.parser = new Parser();
		if (gritqlLanguage) {
			this.parser.setLanguage(gritqlLanguage);
		}
	}

	async provideDocumentSemanticTokens(
		document: TextDocument,
		_token: CancellationToken,
	): Promise<SemanticTokens> {
		// Parse document with tree-sitter
		const tree = this.parser.parse(document.getText());
		if (!tree) {
			return new SemanticTokensBuilder(legend).build();
		}
		// Convert syntax tree to semantic tokens
		const tokens = this._extractTokensFromTree(
			tree.rootNode,
			document.getText(),
		);

		// Build semantic tokens
		const builder = new SemanticTokensBuilder(legend);
		tokens.forEach((token) => {
			builder.push(
				token.line,
				token.startCharacter,
				token.length,
				this._encodeTokenType(token.tokenType),
			);
		});

		return builder.build();
	}

	private _extractTokensFromTree(
		node: Node,
		sourceText: string,
	): IParsedToken[] {
		const tokens: IParsedToken[] = [];
		this._walkTree(node, sourceText, tokens);
		return tokens;
	}

	private _walkTree(
		node: Node,
		sourceText: string,
		tokens: IParsedToken[],
	): void {
		if (node.type === "ERROR") {
			return;
		}

		// Map tree-sitter node types to semantic token types
		const tokenType = mapNodeTypeToSemanticType(node.type);

		// If this node should be tokenized and has no children (leaf node)
		if (tokenType && node.childCount === 0) {
			const startPos = node.startPosition;
			const endPos = node.endPosition;

			tokens.push({
				line: startPos.row,
				startCharacter: startPos.column,
				length: endPos.column - startPos.column,
				tokenType: tokenType,
			});
		}
		// Recursively process children
		node.children.forEach((child) => {
			child && this._walkTree(child, sourceText, tokens);
		});
	}

	private _encodeTokenType(tokenType: string): number {
		const index = tokenTypes.get(tokenType);
		return index !== undefined ? index : 0; // Default to 'variable' if not found
	}
}

async function init(context: ExtensionContext): Promise<void> {
	await initializeTreeSitter(context);
	context.subscriptions.push(
		languages.registerDocumentSemanticTokensProvider(
			{ language: "gritql" },
			new DocumentSemanticTokensProvider(),
			legend,
		),
	);
}

export default { init };
