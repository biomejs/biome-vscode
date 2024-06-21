import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { delimiter } from "node:path";
import { Uri, type WorkspaceFolder } from "vscode";
import { logger } from "./logger";
import { config, getPackageName } from "./utils";
import { fileExists } from "./utils";

/**
 * Biome Executable Locator
 *
 * The locator is responsible for finding a suitable `biome` binary to use on the
 * the user's system. It will search in the following locations in order:
 *
 * 1. The `biome.lsp.bin.[$os-$arch-$libc]` setting in the workspace folder.
 * 2. The `biome.lsp.bin` setting in the workspace folder.
 * 3. The `node_modules` directory in the workspace folder.
 * 4. The Yarn Plug'n'Play (PnP) file in the workspace folder.
 * 5. The `PATH` environment variable.
 *
 * ```json
 * {
 *   "biome.lsp.bin": {
 *     "darwin-x64": "/path/to/biome",
 *     "linux-x64": "/path/to/biome",
 *     "linux-arm64": "/path/to/biome",
 *     "linux-arm64-musl": "/path/to/biome",
 *     "win32-x64": "C:\\path\\to\\biome.exe"
 *   }
 * }
 * ```
 */
export class Locator {
	/**
	 * Finds the `biome` binary from a given workspace folder
	 */
	public async findForWorkspaceFolder(folder: WorkspaceFolder): Promise<
		| {
				uri: Uri;
				source:
					| "settings"
					| "node modules"
					| "yarn pnp file"
					| "path environment variable";
		  }
		| undefined
	> {
		const binPathInSettings = await this.findInSettings(folder);
		if (binPathInSettings) {
			return {
				uri: binPathInSettings,
				source: "settings",
			};
		}

		const binPathInNodeModules = await this.findInNodeModules(folder);
		if (binPathInNodeModules) {
			return {
				uri: binPathInNodeModules,
				source: "node modules",
			};
		}

		const binPathInYarnPnP = await this.findInYarnPnP(folder);
		if (binPathInYarnPnP) {
			return {
				uri: binPathInYarnPnP,
				source: "yarn pnp file",
			};
		}

		const binPathInPathEnvironmentVariable =
			await this.findInPathEnvironmentVariable();
		if (binPathInPathEnvironmentVariable) {
			return {
				uri: binPathInPathEnvironmentVariable,
				source: "path environment variable",
			};
		}
	}

	/**
	 * Finds the `biome` binary globally
	 */
	public async findGlobally(): Promise<Uri | undefined> {
		return (
			(await this.findInSettings()) ??
			(await this.findInPathEnvironmentVariable())
		);
	}

	/**
	 * Resolves the location of the `biome` binary from the settings.
	 *
	 * This method will attempt to locate the `biome` binary at the path
	 * specified in the `biome.lsp.bin` setting. Usual VS Code settings
	 * precedence rules apply.
	 *
	 * @param folder The workspace folder to search in.
	 */
	private async findInSettings(
		folder?: WorkspaceFolder,
	): Promise<Uri | undefined> {
		const bin = config<string | Record<string, string>>("lsp.bin", {
			default: "",
			scope: folder,
		});

		// If the setting is an object, try to find the correct binary for the
		// current platform, architecture, and libc.
		if (typeof bin === "object") {
		}

		if (bin === "") {
			logger.debug(`Setting "biome.lsp.bin" is not set.`);
			return undefined;
		}

		const binPath = Uri.file(bin);

		if (!(await fileExists(binPath))) {
			logger.warn(
				`Could not resolve biome from "biome.lsp.bin" setting because the path does not exist: ${binPath.fsPath}.`,
			);

			return undefined;
		}

		logger.info(
			`Successfully resolved biome from "biome.lsp.bin" setting: ${binPath.fsPath}.`,
		);

		return binPath;
	}

	/**
	 * Resolves the location of the `biome` binary from the `node_modules`
	 * directory.
	 *
	 * This method will attempt to locate the `biome` binary in the `node_modules`
	 * directory of the workspace folder by looking for the platform-specific
	 * `@biomejs/cli-<platform>-<arch>-<libc>` package.
	 *
	 * @param folder The workspace folder to search in.
	 */
	private async findInNodeModules(
		folder: WorkspaceFolder,
	): Promise<Uri | undefined> {
		logger.debug(
			`Attempting to resolve biome from node_modules for workspace folder ${folder.name}.`,
		);

		try {
			const biomePackage = createRequire(
				require.resolve("@biomejs/biome/package.json", {
					paths: [folder.uri.fsPath],
				}),
			);

			const binPackage = dirname(
				biomePackage.resolve(`${getPackageName()}/package.json`),
			);

			const binPath = Uri.file(join(binPackage, withExtension("biome")));

			if (!(await fileExists(binPath))) {
				logger.warn(
					`Could not resolve biome from node_modules in workspace folder ${folder.name} because the path does not exist: ${binPath.fsPath}.`,
				);
				return undefined;
			}

			logger.info(
				`Successfully resolved biome from node_modules for workspace folder ${folder.name}: ${binPath.fsPath}.`,
			);

			return binPath;
		} catch (error) {
			logger.debug(
				`Could not resolve biome from node_modules for workspace folder ${folder.name}: unknown reason.`,
			);
			return undefined;
		}
	}

	/**
	 * Resolves the location of the `biome` binary from the Yarn PnP dependencies.
	 *
	 * This method will attempt to locate the `biome` binary in the Yarn PnP
	 * dependencies of the workspace folder by looking for the platform-specific
	 * `@biomejs/cli-<platform>-<arch>-<libc>` package.
	 *
	 * @param folder The workspace folder to search in.
	 */
	private async findInYarnPnP(
		folder: WorkspaceFolder,
	): Promise<Uri | undefined> {
		logger.debug(
			`Attempting to resolve biome from Yarn PnP dependencies for workspace folder ${folder.name}.`,
		);

		for (const extension of ["cjs", "js"]) {
			const yarnPnpFile = Uri.joinPath(folder.uri, `.pnp.${extension}`);

			if (!(await fileExists(yarnPnpFile))) {
				continue;
			}

			try {
				const yarnPnpApi = require(yarnPnpFile.fsPath);

				const biomePackage = yarnPnpApi.resolveRequest(
					"@biomejs/biome/package.json",
					folder.uri.fsPath,
				);

				if (!biomePackage) {
					continue;
				}

				return yarnPnpApi.resolveRequest(
					`${getPackageName()}/${withExtension("biome")}`,
					biomePackage,
				);
			} catch {
				logger.debug(
					`Could not resolve biome from the Yarn PnP file for workspace folder ${folder.name}: unknown reason.`,
				);
				return undefined;
			}
		}
	}

	/**
	 * Resolves the location of the `biome` binary from the `PATH` environment
	 * variable.
	 *
	 * This method will attempt to locate the `biome` binary in the `PATH`
	 * environment variable by looking for the `biome` binary in each directory
	 * specified in the `PATH` environment variable in order.
	 *
	 * @param folder The workspace folder to search in.
	 */
	private async findInPathEnvironmentVariable(): Promise<Uri | undefined> {
		logger.debug("Attempting to resolve biome from PATH environment variable.");

		const path = process.env.PATH;

		if (!path) {
			return;
		}

		for (const dir of path.split(delimiter)) {
			const biome = Uri.joinPath(Uri.file(dir), withExtension("biome"));

			logger.debug(
				`Looking for biome in PATH environment variable: ${biome.fsPath}`,
			);
			if (await fileExists(biome)) {
				logger.info(
					`Successfully resolved biome from PATH environment variable: ${biome.fsPath}.`,
				);
				return biome;
			}
		}

		logger.debug("Could not resolve biome from PATH environment variable.");

		return undefined;
	}
}
