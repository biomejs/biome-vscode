import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { delimiter } from "node:path";
import { Uri, window } from "vscode";
import { Utils } from "vscode-uri";
import { config, getLspBin } from "./config";
import {
	platformIdentifier,
	platformSpecificBinaryName,
	platformSpecificNodePackageName,
} from "./constants";
import { downloadBiome, getDownloadedVersion } from "./downloader";
import { debug, info } from "./logger";
import { fileExists, hasNodeDependencies } from "./utils";

export type BinaryFinderResult = Promise<{ bin: Uri } | undefined>;

/**
 * VSCode Settings Strategy
 *
 * The VSCode Settings Strategy is responsible for finding a suitable
 * Biome binary from the user's settings in the VSCode workspace configuration.
 *
 * This strategy supports platform-specific settings, meaning that the user can
 * specify different binaries for different combos of OS, architecture and libc.
 *
 * If the `biome.lsp.bin` setting is specified as a string, the strategy will
 * attempt to locate the binary at the specified path. If the binary is not found
 * at the specified path, the strategy will return `undefined`.
 *
 * If the `biome.lsp.bin` setting is specified as an object, the strategy will
 * attempt to locate the binary at the specified path for the current platform
 * (OS, architecture and libc). If the binary is not found at the specified path,
 * the strategy will return `undefined`. The keys of the object are the OS, architecture
 * and libc combos, concatenated with a dash (`-`), and the values are the paths to
 * the binaries.
 *
 * Example:
 *
 * ```json
 * {
 *   "biome.lsp.bin": {
 *   	"linux-x64": "/path/to/biome",
 *      "linux-arm64-musl": "/path/to/biome",
 *      "darwin-arm64": "/path/to/biome",
 *      "win32-x64": "/path/to/biome.exe"
 *   }
 * }
 * ```
 *
 * General VS Code settings overriding rules apply.
 */
const vsCodeSettingsStrategy = {
	name: "VSCode Settings",
	find: async (path?: Uri): Promise<Uri | undefined> => {
		const bin = getLspBin(path);

		const findBinary = async (bin: string): Promise<Uri | undefined> => {
			debug("Trying to find Biome binary in VS Code settings", {
				bin,
			});

			if (bin === "") {
				debug(
					"Biome binary path is empty in VS Code settings, skipping",
				);
				return;
			}

			const resolvedBinPath = path
				? Utils.resolvePath(path, bin).toString()
				: bin;

			const biome = Uri.parse(resolvedBinPath);

			if (await fileExists(biome)) {
				return biome;
			}
		};

		const findPlatformSpecificBinary = async (
			bin: Record<string, string>,
		): Promise<Uri | undefined> => {
			debug(
				"Trying to find platform-specific Biome binary in VS Code settings",
				{ bin },
			);

			if (platformIdentifier in bin) {
				return await findBinary(bin[platformIdentifier]);
			}
		};

		if (typeof bin === "string") {
			return await findBinary(bin);
		}

		if (typeof bin === "object" && bin !== null) {
			return await findPlatformSpecificBinary(bin);
		}

		debug("LSP bin not set VS Code settings", { bin });
	},
};

/**
 * Node Modules Locator Strategy
 *
 * The Node Modules Locator Strategy is responsible for finding a suitable
 * Biome binary from the project's dependencies in the `node_modules` directory
 * by looking for a `@biomejs/cli-{platform}-{arch}{libc}` package, which would
 * usually have been installed as a transitive dependency by the user's package
 * manager.
 *
 * The locator is implemented in such a way that it should work with most if
 * not all packages managers, including npm, pnpm, yarn and bun. Using node's
 * built-in `createRequire`, we create a require function that is scoped to the
 * root `@biomejs/biome` package, which allows us to resolve the platform-specific
 * `@biomejs/cli-{platform}-{arch}{libc}` package. We then resolve the path to the
 * `biome` binary by looking for the `biome` executable in the root of the package.
 *
 * On Linux, we always use the `musl` variant of the binary because it has the
 * advantage of having been built statically. This is meant to improve the
 * compatibility with various systems such as NixOS, which handle dynamically
 * linked binaries differently.
 */
const nodeModulesStrategy = {
	name: "Node Modules",
	find: async (path: Uri): Promise<Uri | undefined> => {
		debug("Trying to find Biome binary in Node Modules", {
			path: path.fsPath,
		});
		try {
			const biomePackage = createRequire(
				require.resolve("@biomejs/biome/package.json", {
					paths: [path.fsPath],
				}),
			);

			// We need to resolve the package.json file here because the
			// platform-specific packages do not have an entry point.
			const binPackage = dirname(
				biomePackage.resolve(
					`${platformSpecificNodePackageName}/package.json`,
				),
			);

			const binPath = Uri.file(
				join(binPackage, platformSpecificBinaryName),
			);

			if (await fileExists(binPath)) {
				return binPath;
			}
		} catch (error) {
			debug("Failed to find Biome binary in Node Modules", { error });
		}
	},
};

/**
 * Yarn Plug'n'Play Strategy
 *
 * The Yarn Plug'n'Play Strategy is responsible for finding a suitable Biome
 * binary from a Yarn Plug'n'Play (PnP) installation by looking for the `biome`
 * binary in the Yarn PnP installation.
 */
const yarnPnpStrategy = {
	name: "Yarn Plug'n'Play",
	find: async (path: Uri): Promise<Uri | undefined> => {
		debug("Trying to find Biome binary in Yarn Plug'n'Play", {
			path: path.fsPath,
		});

		for (const extension of ["cjs", "js"]) {
			const yarnPnpFile = Uri.joinPath(path, `.pnp.${extension}`);

			if (!(await fileExists(yarnPnpFile))) {
				continue;
			}

			try {
				const yarnPnpApi = require(yarnPnpFile.fsPath);

				const biomePackage = yarnPnpApi.resolveRequest(
					"@biomejs/biome/package.json",
					path.fsPath,
				);

				if (!biomePackage) {
					continue;
				}

				return Uri.file(
					yarnPnpApi.resolveRequest(
						`${platformSpecificNodePackageName}/${platformSpecificBinaryName}`,
						biomePackage,
					) as string,
				);
			} catch {
				return undefined;
			}
		}
	},
};

/**
 * Path Environment Variable Strategy
 *
 * The Path Environment Variable Strategy is responsible for finding a suitable
 * Biome binary from the system's PATH environment variable by looking for the
 * `biome` executable in each directories in the PATH.
 *
 * The PATH environment variable is scanned from left to right, and the first
 * `biome` executable found is returned, if any.
 */
const pathEnvironmentVariableStrategy = {
	name: "Path Environment Variable",
	find: async (): Promise<Uri | undefined> => {
		const pathEnv = process.env.PATH;

		debug("Trying to find Biome binary in PATH environment variable", {
			PATH: pathEnv,
		});

		if (!pathEnv) {
			return;
		}

		for (const dir of pathEnv.split(delimiter)) {
			const biome = Uri.joinPath(
				Uri.file(dir),
				platformSpecificBinaryName,
			);

			if (await fileExists(biome)) {
				return biome;
			}
		}

		return undefined;
	},
};

const downloadBiomeStrategy = {
	name: "Download Biome",
	find: async (): Promise<Uri | undefined> => {
		debug("Trying to find downloaded Biome binary");

		const downloadedVersion = await getDownloadedVersion();

		if (downloadedVersion) {
			info(
				`Using previously downloaded version ${downloadedVersion.version}: ${downloadedVersion.binPath.fsPath}`,
			);
			return downloadedVersion.binPath;
		}

		const proceed =
			(await window.showInformationMessage(
				"You've opened a supported file outside of a Biome project, and a globally installed Biome binary could not be found on your system. Would you like to download and install Biome?",
				"Download and install",
				"No",
			)) === "Download and install";

		if (!proceed) {
			return undefined;
		}

		const binPath = await downloadBiome();

		if (binPath) {
			return binPath;
		}
	},
};

/**
 * Finds a suitable Biome binary in the context of the given URI, or dies
 * trying.
 *
 * This function will attempt to find a suitable Biome binary in the context of
 * the given project by trying each locator strategy in order.
 *
 * The order is as follows:
 *
 *  1. VSCode Settings Strategy. We start with this strategy because it is the
 *     most specific and allows the user to explicitly override the binary path.
 *
 *  2. Node Modules Strategy. We then try to find the binary in the project's
 *     dependencies in the `node_modules` directory. This strategy works well
 *     with almost all package managers, except Yarn PnP, for which we have a
 *     dedicated strategy.
 *
 *  3. Yarn Plug'n'Play Strategy. We then try to find the binary in the Yarn
 *     Plug'n'Play installation. This strategy is only used if the project is
 *     using Yarn Plug'n'Play.
 *
 *  4. Path Environment Variable Strategy. We then try to find the binary in the
 *     system's PATH environment variable. This strategy is the least specific
 *     and is used as a last resort to find any globally installed binaries.
 */
export const findBiomeLocally = async (
	path: Uri,
): Promise<BinaryFinderResult> => {
	const binPathInSettings = await vsCodeSettingsStrategy.find(path);
	if (binPathInSettings) {
		info("Found Biome binary in VS Code settings (biome.lsp.bin)", {
			path: binPathInSettings.fsPath,
		});

		return { bin: binPathInSettings };
	}

	const binPathInNodeModules = await nodeModulesStrategy.find(path);
	if (binPathInNodeModules) {
		info("Found Biome binary in Node Modules", {
			path: binPathInNodeModules.fsPath,
		});

		return { bin: binPathInNodeModules };
	}

	const binPathInYarnPnP = await yarnPnpStrategy.find(path);
	if (binPathInYarnPnP) {
		debug("Found Biome binary in Yarn PnP", {
			path: binPathInYarnPnP.fsPath,
		});

		return { bin: binPathInYarnPnP };
	}

	// Todo: remove this conditional when we remove the deprecated `biome.searchInPath` setting
	if (config("searchInPath", { default: true })) {
		const binPathInPathEnvironmentVariable =
			await pathEnvironmentVariableStrategy.find();
		if (binPathInPathEnvironmentVariable) {
			debug("Found Biome binary in PATH environment variable", {
				path: binPathInPathEnvironmentVariable.fsPath,
			});
			return { bin: binPathInPathEnvironmentVariable };
		}
	}

	// We do not want to suggest downloading the binary if the project has node
	// dependencies, because we want to encourage users to install biome as a
	// dev dependency. We however we do want to suggest downloading the binary if
	// the project does not use node dependencies.
	if (!(await hasNodeDependencies(path))) {
		const downloadedBinPath = await downloadBiomeStrategy.find();
		if (downloadedBinPath) {
			debug("Found downloaded Biome binary", {
				path: downloadedBinPath.fsPath,
			});
			return { bin: downloadedBinPath };
		}
	}

	debug("Could not find Biome locally using any of the strategies.");

	return undefined;
};

/**
 * Finds a suitable Biome binary globally.
 *
 * This function will attempt to find a suitable Biome binary in the context of
 * no specific project by trying each locator strategy in order. We usually use
 * this function when we need to find the binary in single-file mode, or when
 * providing Biome to files that haven't yet been saved to disk.
 *
 * The order is as follows:
 *
 *  1. VSCode Settings Strategy. We start with this strategy because it is the
 *     most specific and allows the user to explicitly override the binary path.
 *
 *  2. Path Environment Variable Strategy. We then try to find the binary in the
 *     system's PATH environment variable. This strategy is the least specific
 *     and is used as a last resort to find any globally installed binaries.
 *
 *  3. Use a previously downloaded binary, or prompt the user to download one.
 *     This strategy is used as a last resort to find any previously downloaded
 *     binaries.
 *
 */
export const findBiomeGlobally = async (): Promise<BinaryFinderResult> => {
	const binPathInSettings = await vsCodeSettingsStrategy.find();
	if (binPathInSettings) {
		debug("Found Biome binary in VS Code settings (biome.lsp.bin)", {
			path: binPathInSettings.fsPath,
		});

		return { bin: binPathInSettings };
	}

	// Todo: remove this conditional when we remove the deprecated `biome.searchInPath` setting
	if (config("searchInPath", { default: true })) {
		const binPathInPathEnvironmentVariable =
			await pathEnvironmentVariableStrategy.find();
		if (binPathInPathEnvironmentVariable) {
			debug("Found Biome binary in PATH environment variable", {
				path: binPathInPathEnvironmentVariable.fsPath,
			});

			return { bin: binPathInPathEnvironmentVariable };
		}
	}

	const downloadedBinPath = await downloadBiomeStrategy.find();
	if (downloadedBinPath) {
		debug("Found downloaded Biome binary", {
			path: downloadedBinPath.fsPath,
		});

		return { bin: downloadedBinPath };
	}

	debug("Could not find Biome globally using any of the strategies");

	return undefined;
};
