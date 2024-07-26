import type { Uri } from "vscode";
import { debug } from "../logger";
import { NodeModulesStrategy } from "./strategies/node-modules";
import { PathEnvironmentVariableStrategy } from "./strategies/path-environment-variable";
import { VSCodeSettingsStrategy } from "./strategies/vscode-settings";
import { YarnPnPStrategy } from "./strategies/yarn-pnp";

/**
 * Attempts to find a suitable Biome binary in the context of the given URI.
 */
export const findBiomeLocally = async (
	uri: Uri,
): Promise<
	| {
			uri: Uri;
			source: "settings" | "node modules" | "yarn pnp file" | "PATH";
	  }
	| undefined
> => {
	const binPathInSettings = await new VSCodeSettingsStrategy(uri).find();
	if (binPathInSettings) {
		debug(`Found Biome binary in VS Code settings: ${binPathInSettings}`);
		return {
			uri: binPathInSettings,
			source: "settings",
		};
	}

	const binPathInNodeModules = await new NodeModulesStrategy(uri).find();
	if (binPathInNodeModules) {
		debug(`Found Biome binary in node_modules: ${binPathInNodeModules}`);
		return {
			uri: binPathInNodeModules,
			source: "node modules",
		};
	}

	const binPathInYarnPnP = await new YarnPnPStrategy(uri).find();
	if (binPathInYarnPnP) {
		debug(`Found Biome binary in Yarn PnP file: ${binPathInYarnPnP}`);
		return {
			uri: binPathInYarnPnP,
			source: "yarn pnp file",
		};
	}

	const binPathInPathEnvironmentVariable =
		await new PathEnvironmentVariableStrategy(uri).find();
	if (binPathInPathEnvironmentVariable) {
		debug(
			`Found Biome binary in PATH environment variable: ${binPathInPathEnvironmentVariable}`,
		);
		return {
			uri: binPathInPathEnvironmentVariable,
			source: "PATH",
		};
	}
};

/**
 * Attempts to find a suitable Biome binary globally.
 */
export const findBiomeGlobally = async (): Promise<
	| {
			uri: Uri;
			source: "settings" | "PATH";
	  }
	| undefined
> => {
	const binPathInSettings = await new VSCodeSettingsStrategy().find();
	if (binPathInSettings) {
		return {
			uri: binPathInSettings,
			source: "settings",
		};
	}

	const binPathInPathEnvironmentVariable =
		await new PathEnvironmentVariableStrategy().find();
	if (binPathInPathEnvironmentVariable) {
		return {
			uri: binPathInPathEnvironmentVariable,
			source: "PATH",
		};
	}
};
