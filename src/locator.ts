import { createRequire } from "node:module";
import { homedir } from "node:os";
import { delimiter, dirname } from "node:path";
import { env } from "node:process";
import {
	ConfigurationTarget,
	Uri,
	env as vscodeEnv,
	window,
	workspace,
} from "vscode";
import { Utils } from "vscode-uri";
import type Biome from "./biome";
import {
	platformIdentifier,
	platformSpecificBinaryName,
	platformSpecificNodePackageName,
} from "./constants";
import {
	config,
	fileExists,
	getLspBin,
	type SafeSpawnSyncOptions,
	safeSpawnSync,
} from "./utils";

export default class Locator {
	private get globalNodeModulesPaths(): Record<string, Uri | undefined> {
		const npmGlobalNodeModulesPath = safeSpawnSync("npm", ["root", "-g"], {
			shell: true,
		});
		const pnpmGlobalNodeModulesPath = safeSpawnSync("pnpm", ["root", "-g"], {
			shell: true,
		});
		const bunGlobalNodeModulesPath = Utils.resolvePath(
			Uri.file(homedir()),
			".bun/install/global/node_modules",
		);

		return {
			npm: npmGlobalNodeModulesPath
				? Uri.file(npmGlobalNodeModulesPath)
				: undefined,
			pnpm: pnpmGlobalNodeModulesPath
				? Uri.file(pnpmGlobalNodeModulesPath)
				: undefined,
			bun: bunGlobalNodeModulesPath,
		};
	}

	/**
	 * Creates a new Locator
	 */
	constructor(private readonly biome: Biome) {}

	/**
	 * Unshims the Biome binary if it is a shim.
	 *
	 * Sometimes, users specify the path to what they think is the Biome binary,
	 * but it is actually a shim to the real binary. This can also happen when
	 * package managers create shims that they place in the PATH.
	 *
	 * In these cases, we need to attempt to resolve the real Biome binary
	 * by executing the shim with the `__where_am_i` command. This only works
	 * from Biome v2 onwards, so if the shim is from an earlier version,
	 * we will return the original path.
	 */
	private async unshim(biome: Uri | undefined): Promise<Uri | undefined> {
		if (!biome) {
			return biome;
		}

		this.biome.logger.debug(`🔍 Unshimming Biome binary at "${biome.fsPath}"`);

		try {
			const spawnSyncOptions: SafeSpawnSyncOptions = {};

			// Set the current working directory to the project root, if it exists. This runs the `biome` binary from the
			// project root in case the user's local development environment depends on this, such as when using `asdf`.
			if (this.biome.workspaceFolder?.uri)
				spawnSyncOptions.cwd = this.biome.workspaceFolder.uri.fsPath;

			// Check the version of Biome
			const version = safeSpawnSync(
				biome.fsPath,
				["--version"],
				spawnSyncOptions,
			)
				?.split("Version: ")[1]
				?.trim();

			if (!version) {
				this.biome.logger.warn(
					`🔍 Could not determine the version of Biome binary at "${biome.fsPath}"`,
				);
				return biome;
			}

			if (version.startsWith("1")) {
				this.biome.logger.warn(
					`🔍 Cannot unshim Biome binary at "${biome.fsPath}" because it is version 1.x.x. Please update to version 2 or higher.`,
				);
				return biome;
			}

			// If the version is 2 or higher, we can safely unshim
			const realPath = safeSpawnSync(
				biome.fsPath,
				["__where_am_i"],
				spawnSyncOptions,
			);

			if (!realPath) {
				this.biome.logger.warn(
					`🔍 Could not resolve the real path for Biome binary at "${biome.fsPath}"`,
				);
				return biome;
			}

			// If the paths differ, we have successfully unshimmed the binary
			// and we'll log a warning to that effect.
			if (realPath !== biome.fsPath) {
				this.biome.logger.warn(
					`🔍 Unshimmed Biome binary from "${biome.fsPath}" to "${realPath}"`,
				);

				return Uri.file(realPath);
			}
		} catch (error) {
			this.biome.logger.warn(
				`🔍 Error while unshimming Biome binary at "${biome.fsPath}": ${error}`,
			);
		}

		return biome;
	}

	/**
	 * Attempts to locate the Biome binary in the context of a workspace folder.
	 *
	 * This method will try to find the Biome binary using the following strategies:
	 *
	 * 1. Check the user's settings for a custom Biome binary path.
	 * 2. Check the project's `node_modules` directory for a Biome binary.
	 * 3. Check the project's `yarn` PnP configuration for a Biome binary.
	 * 4. Check the system's PATH environment variable for a Biome binary.
	 */
	public async findBiomeForWorkspaceFolder(): Promise<Uri | undefined> {
		const biome =
			(await this.findBiomeInSettings()) ??
			(await this.findBiomeInNodeModules()) ??
			(await this.findBiomeInGlobalNodeModules()) ??
			(await this.findBiomeInYarnPnp()) ??
			(await this.findBiomeInPath());

		return await this.unshim(biome);
	}

	/**
	 * Attempts to locate the Biome binary in the context of a global instance.
	 *
	 * This method will try to find the Biome binary using the following strategies:
	 *
	 * 1. Check the user's settings for a custom Biome binary path.
	 * 2. Check the system's PATH environment variable for a Biome binary.
	 */
	public async findBiomeForGlobalInstance(): Promise<Uri | undefined> {
		return (
			(await this.findBiomeInSettings()) ??
			(await this.findBiomeInGlobalNodeModules()) ??
			(await this.findBiomeInPath()) ??
			(await this.suggestInstallingBiomeGlobally())
		);
	}

	/**
	 * Finds the Biome binary in the user's settings.
	 *
	 * This strategy is responsible for finding the Biome binary as specified
	 * in the user's settings in the `biome.lsp.bin` configuration option.
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
	 + General VS Code settings overriding rules apply.
	 */
	public async findBiomeInSettings(): Promise<Uri | undefined> {
		this.biome.logger.debug(`🔍 Looking for a Biome binary in "biome.lsp.bin"`);

		const biomeLspBin = getLspBin(this.biome.workspaceFolder);

		if (!biomeLspBin) {
			this.biome.logger.debug(
				`🔍 Biome binary could not be found in "biome.lsp.bin"`,
			);
			return;
		}

		this.biome.logger.debug(
			`Setting "biome.lsp.bin" is set to: ${JSON.stringify(biomeLspBin)}`,
		);

		const findBinary = async (biomeLspBin: Uri): Promise<Uri | undefined> => {
			if (!biomeLspBin) {
				this.biome.logger.debug(
					`🔍 Biome binary could not be found in "biome.lsp.bin"`,
				);
				return;
			}

			this.biome.logger.debug(
				`🔍 Checking if Biome binary exists at "${biomeLspBin.fsPath}"`,
			);

			if (await fileExists(biomeLspBin)) {
				this.biome.logger.debug(
					`🔍 Found existing Biome binary at "${biomeLspBin.fsPath}"`,
				);
				return biomeLspBin;
			}

			this.biome.logger.debug(
				`🔍 Biome binary could not be found in "biome.lsp.bin"`,
			);
		};

		const findPlatformSpecificBinary = async (
			biomeLspBin: Record<string, Uri>,
		): Promise<Uri | undefined> => {
			if (platformIdentifier in biomeLspBin) {
				this.biome.logger.debug(
					`🔍 Found platform-specific "biome.lsp.bin" setting for "${platformIdentifier}".`,
				);
				return await findBinary(biomeLspBin[platformIdentifier]);
			}
		};

		return biomeLspBin instanceof Uri
			? await findBinary(biomeLspBin)
			: await findPlatformSpecificBinary(biomeLspBin);
	}

	/**
	 * Finds the Biome binary in the project's dependencies
	 *
	 * The Node Modules Locator Strategy is responsible for finding a suitable
	 * Biome binary from the project's dependencies in the `node_modules` directory
	 * by looking for a `@biomejs/cli-{platform}-{arch}{libc}` package, which would
	 * usually have been installed as a transitive dependency by the user's package
	 * manager.
	 *
	 * The locator is implemented in such a way that it should work with most if
	 * not all packages managers, including npm, pnpm, yarn and bun. Using node's
	 *  built-in `createRequire`, we create a require function that is scoped to the
	 * root `@biomejs/biome` package, which allows us to resolve the platform-specific
	 * `@biomejs/cli-{platform}-{arch}{libc}` package. We then resolve the path to the
	 * `biome` binary by looking for the `biome` executable in the root of the package.
	 *
	 * On Linux, we always use the `musl` variant of the binary because it has the
	 * advantage of having been built statically. This is meant to improve the
	 * compatibility with various systems such as NixOS, which handle dynamically
	 * linked binaries differently.
	 */
	private async findBiomeInNodeModules(
		rootPath?: Uri,
	): Promise<Uri | undefined> {
		const searchRoot = rootPath ?? this.biome.workspaceFolder?.uri;

		if (!searchRoot) {
			return;
		}

		this.biome.logger.debug(
			`🔍 Looking for a Biome binary in Node Modules ${searchRoot.fsPath}`,
		);

		try {
			// Resolve the path to the root @biomejs/biome package starting
			// from the root of the workspace folder.

			const pathToRootBiomePackage = require.resolve(
				"@biomejs/biome/package.json",
				{
					paths: [searchRoot.fsPath],
				},
			);

			// Create a require function scoped to @biomejs/biome package.
			const rootBiomePackage = createRequire(pathToRootBiomePackage);

			// Resolve the path to the platform-specific @biomejs/cli-* package.
			const pathToBiomeCliPackage = Uri.file(
				dirname(
					rootBiomePackage.resolve(
						`${platformSpecificNodePackageName}/package.json`,
					),
				),
			);

			// Resolve the path to the biome binary.
			const biome = Uri.joinPath(
				pathToBiomeCliPackage,
				platformSpecificBinaryName,
			);

			if (await fileExists(biome)) {
				this.biome.logger.debug(`🔍 Found Biome binary at "${biome.fsPath}"`);
				return biome;
			}
		} catch (error) {
			this.biome.logger.debug(
				`🔍 Error while looking for Biome binary in node modules: ${error}`,
			);
		}
	}

	private async findBiomeInGlobalNodeModules(): Promise<Uri | undefined> {
		this.biome.logger.debug(
			"🔍 Looking for a Biome binary in global Node Modules",
		);

		const globalNodeModulesPaths = this.globalNodeModulesPaths;

		for (const [key, path] of Object.entries(globalNodeModulesPaths)) {
			this.biome.logger.debug(
				`🔍 Found global Node Modules path for ${key}: ${path}`,
			);

			if (!path) {
				this.biome.logger.warn(
					`🔍 Could not find global Node Modules path for ${key}`,
				);
				continue;
			}

			const biome = await this.findBiomeInNodeModules(path);

			if (biome) {
				return biome;
			}
		}

		return undefined;
	}

	private async findBiomeInYarnPnp(): Promise<Uri | undefined> {
		const folder = this.biome.workspaceFolder;
		if (!folder) {
			return;
		}

		this.biome.logger.debug("🔍 Looking for a Biome binary in Yarn PnP");

		for (const extension of ["cjs", "js"]) {
			const yarnPnpFile = Uri.joinPath(folder.uri, `.pnp.${extension}`);

			if (!(await fileExists(yarnPnpFile))) {
				continue;
			}

			try {
				const yarnPnpApi = require(yarnPnpFile.fsPath);

				const rootBiomePackage = yarnPnpApi.resolveRequest(
					"@biomejs/biome/package.json",
					folder.uri.fsPath,
				);

				if (!rootBiomePackage) {
					continue;
				}

				const biome = Uri.file(
					yarnPnpApi.resolveRequest(
						`${platformSpecificNodePackageName}/${platformSpecificBinaryName}`,
						rootBiomePackage,
					) as string,
				);

				if (await fileExists(biome)) {
					this.biome.logger.debug(`🔍 Found Biome binary at "${biome.fsPath}"`);
					return biome;
				}
			} catch {
				return undefined;
			}
		}
	}

	/**
	 * Finds the Biome binary in the PATH.
	 *
	 * This method will attempt to find the Biome binary in the directories
	 * listed in the PATH environment variable. The PATH environment variable
	 * is scanned from left to right, and the first Biome binary that is found
	 * will be returned.
	 */
	private async findBiomeInPath(): Promise<Uri | undefined> {
		this.biome.logger.debug("🔍 Looking for a Biome binary in PATH");

		const path = env.PATH;

		if (!path) {
			this.biome.logger.warn("The PATH environment variable is not set.");
			return;
		}

		for (const dir of path.split(delimiter)) {
			const biome = Uri.joinPath(Uri.file(dir), platformSpecificBinaryName);
			if (await fileExists(biome)) {
				this.biome.logger.debug(
					`🔍 Found Biome binary at "${biome.fsPath}" in PATH`,
				);
				return biome;
			}
		}

		return undefined;
	}

	private async suggestInstallingBiomeGlobally(): Promise<undefined> {
		if (config("suggestInstallingGlobally") === false) {
			return;
		}

		const result = await window.showWarningMessage(
			"Please install Biome globally on your system so the extension can start a global LSP session for files that are not part of any workspace.",
			"See instructions",
			"Do not show again",
		);

		if (result === "See instructions") {
			vscodeEnv.openExternal(
				Uri.parse("https://biomejs.dev/guides/manual-installation/"),
			);
		}

		if (result === "Do not show again") {
			await workspace
				.getConfiguration("biome")
				.update("suggestInstallingGlobally", false, ConfigurationTarget.Global);
		}

		return undefined;
	}
}
