import { spawnSync } from "node:child_process";
import isWSL from "is-wsl";

/**
 * Identifiers of the languages supported by the extension
 *
 * This constant contains a list of identifiers of the languages supported by the
 * extension. These identifiers are used determine whether LSP sessions should be
 * taking a given file into account or not.
 */
export const supportedLanguages: string[] = [
	"astro",
	"css",
	"graphql",
	"grit",
	"html",
	"javascript",
	"javascriptreact",
	"json",
	"jsonc",
	"snippets",
	"svelte",
	"tailwindcss",
	"typescript",
	"typescriptreact",
	"vue",
];

/**
 * Whether the current platform uses musl
 */
export const isMusl = (() => {
	// If not on Linux, or on WSL we can't be using musl
	if (process.platform !== "linux" || isWSL) {
		return false;
	}

	try {
		const output = spawnSync("ldd", ["--version"], { encoding: "utf8" });
		return output.stdout.includes("musl");
	} catch {
		return false;
	}
})();

/**
 * Platform identifier
 *
 * This constant contains the identifier of the current platform.
 *
 * @example "linux-x64"
 * @example "linux-x64-musl"
 * @example "darwin-arm64"
 * @example "win32-x64"
 */
export const platformIdentifier = (() => {
	let flavor = "";

	if (isMusl) {
		flavor = "-musl";
	}

	return `${process.platform}-${process.arch}${flavor}`;
})();

/**
 * Platform-specific binary name
 *
 * This constant contains the name of the Biome binary for the current
 * platform.
 *
 * @example "biome" (on Linux, macOS, and other Unix-like systems)
 * @example "biome.exe" (on Windows)
 */
export const platformSpecificBinaryName = (() => {
	return `biome${process.platform === "win32" ? ".exe" : ""}`;
})();

/**
 * Platform-specific package name
 *
 * This constant contains the name of the Biome CLI package for the current
 * platform.
 *
 * @example "cli-linux-x64"
 * @example "cli-darwin-x64"
 * @example "cli-win32-x64"
 */
export const platformSpecificPackageName = (() => {
	return `cli-${platformIdentifier}`;
})();

/**
 * Platform-specific node package name
 *
 * This constant contains the name of the Biome CLI node package for the current
 * platform.
 *
 * @example "@biomejs/cli-linux-x64"
 * @example "@biomejs/cli-darwin-x64"
 * @example "@biomejs/cli-win32-x64"
 */
export const platformSpecificNodePackageName = (() => {
	return `@biomejs/${platformSpecificPackageName}`;
})();
