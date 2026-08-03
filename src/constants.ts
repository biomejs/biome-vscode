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
	"xml",
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
		return output.stdout.includes("musl") || output.stderr.includes("musl");
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
 * Platform-specific binary names
 *
 * Possible Biome binary/shim names for the current platform. On Windows,
 * package managers expose `biome.cmd` (and sometimes `biome.ps1`) on PATH
 * rather than `biome.exe`. The real executable usually lives in a
 * content-addressable store outside PATH.
 *
 * @example ["biome"] (on Linux, macOS, and other Unix-like systems)
 * @example ["biome.exe", "biome.cmd"] (on Windows)
 */
export const platformSpecificBinaryNames = (() => {
	if (process.platform === "win32") {
		return ["biome.exe", "biome.cmd"];
	}

	return ["biome"];
})();

/**
 * Platform-specific default binary name
 *
 * Preferred name when resolving a binary inside a known package directory
 * (node_modules / Yarn PnP), where the real `biome.exe` (Windows) or
 * `biome` (Unix) is present.
 *
 * @example "biome" (on Linux, macOS, and other Unix-like systems)
 * @example "biome.exe" (on Windows)
 */
export const platformSpecificDefaultBinaryName = (() => {
	return platformSpecificBinaryNames[0];
})();

/**
 * @deprecated Use {@link platformSpecificDefaultBinaryName} or
 * {@link platformSpecificBinaryNames}. Kept as an alias for call sites that
 * intentionally want the real package binary name.
 */
export const platformSpecificBinaryName = platformSpecificDefaultBinaryName;

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
