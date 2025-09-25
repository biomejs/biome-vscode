import * as vscode from "vscode";
import type Parser from "web-tree-sitter";

const outputChannel = vscode.window.createOutputChannel(
	"GritQL Token Provider",
);

export function activate(context: vscode.ExtensionContext) {
	outputChannel.appendLine("Activating GritQL Token Provider");
	context.subscriptions.push(
		vscode.languages.registerDocumentSemanticTokensProvider(
			{ language: "grit" },
			new DocumentSemanticTokensProvider(),
			legend,
		),
	);
}

// Define semantic token legend
const legend = new vscode.SemanticTokensLegend(
	["variable", "function", "string", "number"],
	[],
);

// Token types are defined in the legend array above
const tokenModifiers = new Map<string, number>();

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
	private parser: Parser | null = null;
	private language: Parser.Language | null = null;

	async provideDocumentSemanticTokens(
		document: vscode.TextDocument,
		_token: vscode.CancellationToken,
	): Promise<vscode.SemanticTokens> {
		outputChannel.appendLine(
			`Providing semantic tokens for document: ${document.uri.toString()}`,
		);
		try {
			// Skip tree-sitter for now and use a simple regex-based tokenizer
			// This will be much more reliable and easier to maintain
			if (!this.parser) {
				this.parser = "TODO" as any; // Just mark as initialized
			}

			const allTokens = this._parseText(document.getText());
			outputChannel.appendLine(`Parsed ${allTokens.length} tokens`);

			const builder = new vscode.SemanticTokensBuilder();
			allTokens.forEach((token) => {
				builder.push(
					token.line,
					token.startCharacter,
					token.length,
					this._encodeTokenType(token.tokenType),
					this._encodeTokenModifiers(token.tokenModifiers),
				);
			});
			return builder.build();
		} catch (error) {
			outputChannel.appendLine(
				`Error in provideDocumentSemanticTokens: ${error}`,
			);
			return new vscode.SemanticTokensBuilder().build();
		}
	}

	private _parseText(text: string): IParsedToken[] {
		if (!this.parser) {
			return [];
		}

		const tokens: IParsedToken[] = [];
		const lines = text.split("\n");

		// TODO: Replace with actual tree-sitter parsing logic that maps Tree-sitter nodes to IParsedToken[]
		// GritQL-specific regex patterns
		const patterns = [
			// Keywords and control flow
			{
				regex:
					/\b(engine|where|contains|not|and|or|if|else|match|bubble|until|limit|from|to|as)\b/g,
				type: "function",
			},
			// String literals (including template literals and regex patterns)
			{ regex: /"[^"]*"|'[^']*'|`[^`]*`|\/[^/\n]*\/[gimuy]*/g, type: "string" },
			// Numbers
			{ regex: /\b\d+(\.\d+)?\b/g, type: "number" },
			// Variables and identifiers (lower priority, matches last)
			{ regex: /\b[a-zA-Z_$]\w*\b/g, type: "variable" },
		];

		lines.forEach((line, lineIndex) => {
			patterns.forEach((pattern) => {
				pattern.regex.lastIndex = 0; // Reset regex state

				let match = pattern.regex.exec(line);
				while (match !== null) {
					tokens.push({
						line: lineIndex,
						startCharacter: match.index,
						length: match[0].length,
						tokenType: pattern.type,
						tokenModifiers: [],
					});
					match = pattern.regex.exec(line);
				}
			});
		});

		return tokens;
	}
	private _encodeTokenType(tokenType: string): number {
		const index = legend.tokenTypes.indexOf(tokenType);
		return index >= 0 ? index : 0;
	}

	private _encodeTokenModifiers(strTokenModifiers: string[]): number {
		let result = 0;
		for (const tokenModifier of strTokenModifiers) {
			if (tokenModifiers.has(tokenModifier)) {
				result = result | (1 << tokenModifiers.get(tokenModifier)!);
			}
		}
		return result;
	}
}
