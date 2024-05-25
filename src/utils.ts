import { spawnSync } from "node:child_process";
import { type TextDocument, type TextEditor, commands } from "vscode";

const SUPPORTED_LANGUAGES = new Set(["javascript", "typescript"]);

export type BiomeDocument = TextDocument & {
	languageId: keyof typeof SUPPORTED_LANGUAGES;
};
export type BiomeEditor = TextEditor & { document: BiomeDocument };

/** Sets ['when'](https://code.visualstudio.com/docs/getstarted/keybindings#_when-clause-contexts) clause contexts */
export function setContextValue(key: string, value: unknown): Thenable<void> {
	return commands.executeCommand("setContext", key, value);
}

/**
 * Checks if the current document is supported by Biome
 *
 * @param {TextDocument} document
 */
export function isBiomeDocument(document: TextDocument) {
	return SUPPORTED_LANGUAGES.has(document.languageId);
}

export function isBiomeEditor(editor: TextEditor): editor is BiomeEditor {
	return isBiomeDocument(editor.document);
}

/**
 * Determines if the current system is using musl libc
 *
 * On Linux, the output of the `ldd --version` command will contain the string `musl`
 * if the system is using musl libc.
 *
 * On non-Linux systems, the function will return false.
 *
 * @returns boolean
 */
export function isMusl() {
	if (process.platform !== "linux") {
		return false;
	}

	try {
		const output = spawnSync("ldd", ["--version"], {
			encoding: "utf8",
		});
		return output.stdout.includes("musl") || output.stderr.includes("musl");
	} catch {
		return false;
	}
}
