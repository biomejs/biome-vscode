import * as vscode from "vscode";
import type {
	Language as LanguageType,
	Node,
	Parser as ParserType,
	Tree,
} from "web-tree-sitter";
import {
	mapNodeTypeToSemanticModifiers,
	mapNodeTypeToSemanticType,
} from "./node_to_token";

const { Parser, Language } = require("web-tree-sitter");

const outputChannel = vscode.window.createOutputChannel(
	"GritQL Token Provider",
);

let gritqlLanguage: LanguageType | null = null;

// Initialize tree-sitter with GritQL grammar
async function initializeTreeSitter(): Promise<void> {
	try {
		await Parser.init();
		// TODO: Propose tree-sitter-gritql to be published to npm
		// The npm release should also include the WASM file for usage here
		gritqlLanguage = await Language.load(
			"/Users/vinh/github/daivinhtran/biome-vscode/node_modules/tree-sitter-gritql/tree-sitter-gritql.wasm",
		);
		outputChannel.appendLine("Successfully loaded GritQL tree-sitter language");
	} catch (error) {
		outputChannel.appendLine(`Failed to load GritQL tree-sitter: ${error}`);
		throw error;
	}
}

export async function activate(context: vscode.ExtensionContext) {
	// Initialize tree-sitter before registering the provider
	await initializeTreeSitter();
	context.subscriptions.push(
		vscode.languages.registerDocumentSemanticTokensProvider(
			{ language: "gritql" },
			new DocumentSemanticTokensProvider(),
			legend,
		),
	);
}

// Define semantic token legend for GritQL
// https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#standard-token-types-and-modifiers
const legend = new vscode.SemanticTokensLegend(
	// token types - must match the types returned by mapNodeTypeToSemanticType
	[
		"variable", // 0 - for variables, underscore, languageName
		"string", // 1 - for codeSnippet, doubleQuoteSnippet
		"number", // 2 - for intConstant, signedIntConstant, doubleConstant
		"keyword", // 3 - for keywords and booleanConstant
		"comment", // 4 - for comments
		"function", // 5 - for predicateCall, nodeLike, name
		"parameter", // 6 - for namedArg (attribute equivalent)
		"operator", // 7 - for operators and punctuation
		"regexp", // 8 - for regex, snippetRegex
	],
	// token modifiers - for special cases like @variable.special
	[
		"readonly", // 0 - for special variables like engine names
		"declaration", // 1 - for labels and declarations
	],
);

interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}

class DocumentSemanticTokensProvider
	implements vscode.DocumentSemanticTokensProvider
{
	private parser: ParserType;
	constructor() {
		// Initialize parser synchronously - tree-sitter should be ready by now
		this.parser = new Parser();
		if (gritqlLanguage) {
			this.parser.setLanguage(gritqlLanguage);
		}
	}

	async provideDocumentSemanticTokens(
		document: vscode.TextDocument,
		_token: vscode.CancellationToken,
	): Promise<vscode.SemanticTokens> {
		// Parse document with tree-sitter
		const tree: Tree = this.parser.parse(document.getText())!;
		// Convert syntax tree to semantic tokens
		const tokens = this._extractTokensFromTree(
			tree.rootNode,
			document.getText(),
		);

		// Build semantic tokens
		const builder = new vscode.SemanticTokensBuilder(legend);
		tokens.forEach((token) => {
			builder.push(
				token.line,
				token.startCharacter,
				token.length,
				this._encodeTokenType(token.tokenType),
				this._encodeTokenModifiers(token.tokenModifiers),
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
			const modifiers = mapNodeTypeToSemanticModifiers(node.type, node.parent);

			tokens.push({
				line: startPos.row,
				startCharacter: startPos.column,
				length: endPos.column - startPos.column,
				tokenType: tokenType,
				tokenModifiers: modifiers,
			});
		}
		// Recursively process children
		node.children.forEach((child) => {
			child && this._walkTree(child, sourceText, tokens);
		});
	}

	// The encoder functions below are adapted from
	// https://github.com/microsoft/vscode-extension-samples/blob/bb7fc981628a99f149adf7745d60ce488f81d8cc/semantic-tokens-sample/src/extension.ts#L45-L64
	// TODO(daivinhtran): Improve runtime by using Map

	private _encodeTokenType(tokenType: string): number {
		const index = legend.tokenTypes.indexOf(tokenType);
		return index >= 0 ? index : 0; // Default to 'variable' if not found
	}

	private _encodeTokenModifiers(modifiers: string[]): number {
		let result = 0;
		modifiers.forEach((modifier) => {
			const index = legend.tokenModifiers.indexOf(modifier);
			if (index >= 0) {
				result |= 1 << index;
			}
		});
		return result;
	}
}
