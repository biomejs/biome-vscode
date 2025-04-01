import { spawnSync } from "node:child_process";
import isWSL from "is-wsl";
import { workspace } from "vscode";

/**
 * Activation timestamp
 *
 * This constant contains the timestamp at which the extension was activated.
 *
 * We use this constant to generate unique identifiers for output channels to
 * mitigate a bug in VS Code where the output channel is not cleared.
 *
 * @see https://github.com/microsoft/vscode/issues/204946
 */
export const activationTimestamp = Date.now();

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
 * This constant contains the name of the Biome CLI binary for the current
 * platform.
 *
 * @example "biome" (on Linux, macOS, and other Unix-like systems)
 * @example "biome.exe" (on Windows)
 */
export const platformSpecificBinaryName = (() => {
	return `biome${process.platform === "win32" ? ".exe" : ""}`;
})();

/**
 * Platform-specific asset name
 *
 * This constant contains the name of Biome CLI GitHub release asset for the
 * current platform.
 *
 * On Linux, we always return the musl flavor, as it's the most compatible
 * since its statically linked.
 *
 * @example "biome-linux-x64-musl"
 * @example "biome-darwin-x64"
 * @example "biome-win32-x64.exe"
 */
export const platformSpecificAssetName = (() => {
	return `biome-${platformIdentifier}${process.platform === "win32" ? ".exe" : ""}`;
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

/**
 * Identifiers of the languages supported by the extension
 *
 * This constant contains a list of identifiers of the languages supported by the
 * extension. These identifiers are used determine whether LSP sessions should be
 * taking a given file into account or not.
 */
export const supportedLanguageIdentifiers: string[] = [
	"astro",
	"css",
	"graphql",
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

export type OperatingMode = "single-file" | "single-root" | "multi-root";

/**
 * Operating mode of the extension
 *
 * This constant contains the operating mode of the extension. The operating
 * mode determines whether the extension is operating in single-file,
 * single-root, or multi-root mode, which impacts how the extension behaves and
 * how LSP sessions are created.
 *
 * This can be a constant because whenever the operating mode changes, VS Code
 * reloads the window, which causes the extension to be destroyed and
 * recreated.
 */
export const operatingMode: OperatingMode = (() => {
	// If there aren't any workspace folders, we assume to be operating in
	// single-file mode.
	if (workspace.workspaceFolders === undefined) {
		return "single-file";
	}

	// If more than one workspace folder is present, we assume to be operating
	// in multi-root mode.
	if (workspace.workspaceFolders.length > 1) {
		return "multi-root";
	}

	// Otherwise, we assume to be operating in single-root mode.
	return "single-root";
})();
