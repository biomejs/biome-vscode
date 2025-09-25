// The mapping here is canonical to the mapping between tree-sitter nodes to captures
// in https://github.com/biomejs/biome-zed/blob/main/languages/grit/highlights.scm
import type { Node } from "web-tree-sitter";

export function mapNodeTypeToSemanticType(nodeType: string): string | null {
	// Map GritQL tree-sitter node types to VS Code semantic token types
	switch (nodeType) {
		// Variables - from @variable rule
		case "variable":
		case "underscore":
		case "languageName":
			return "variable";

		// Strings - from @string rule
		case "codeSnippet":
		case "doubleQuoteSnippet":
			return "string";

		// Numbers - from @number rule
		case "intConstant":
		case "signedIntConstant":
		case "doubleConstant":
			return "number";

		// Boolean - from @boolean rule
		case "booleanConstant":
			return "keyword"; // VS Code doesn't have boolean type, use keyword

		// Comments - from @comment rule
		case "comment":
			return "comment";

		// Functions - from @function rule (predicateCall, nodeLike, name)
		case "predicateCall":
		case "nodeLike":
		case "name":
			return "function";

		// Attributes - from @attribute rule
		case "namedArg":
			return "parameter"; // VS Code equivalent of attribute

		// Keywords - from @keyword rule (comprehensive list)
		case "bubble":
		case "sequential":
		case "multifile":
		case "and":
		case "any":
		case "not":
		case "maybe":
		case "contains":
		case "until":
		case "as":
		case "within":
		case "after":
		case "before":
		case "some":
		case "every":
		case "limit":
		case "includes":
		case "like":
		case "private":
		case "if":
		case "else":
		case "where":
		case "or":
		case "orelse":
		case "return":
			return "keyword";

		// Operators - from @operator rule
		case "*":
		case "/":
		case "%":
		case "+":
		case "-":
		case "!":
		case "=":
		case "+=":
		case ">":
		case "<":
		case ">=":
		case "<=":
		case "!=":
		case "==":
		case "<:":
			return "operator";

		// Regular expressions - from @string.regex rule
		case "regex":
		case "snippetRegex":
			return "regexp";

		// Punctuation delimiters - map to operator for VS Code
		case ";":
		case ".":
		case ",":
		case ":":
			return "operator";

		// Punctuation brackets - VS Code doesn't have bracket type, skip
		case "(":
		case ")":
		case "[":
		case "]":
		case "{":
		case "}":
			return null; // Let VS Code handle bracket highlighting

		default:
			// Don't tokenize unknown node types
			return null;
	}
}

export function mapNodeTypeToSemanticModifiers(
	nodeType: string,
	parent: Node | null,
): string[] {
	const modifiers: string[] = [];

	// Based on biome-zed highlights.scm special cases
	switch (nodeType) {
		// @string.regex for regex patterns
		case "regex":
		case "snippetRegex":
			// Already handled by returning 'regexp' type
			break;

		case "languageName":
			if (parent) {
				if (parent.type === "engine") {
					// @variable.special for engine names like "marzano"
					modifiers.push("readonly");
				} else if (parent.type === "languageSpecificSnippet") {
					// @label for language names in languageSpecificSnippet
					modifiers.push("declaration");
				}
			}
			break;
	}

	return modifiers;
}
