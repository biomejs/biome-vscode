import { delimiter } from "node:path";
import { Uri } from "vscode";
import { binaryName, fileExists, logger } from "../../utils";
import { LocatorStrategy } from "../strategy";

/**
 * Path Environment Variable Strategy
 *
 * The Path Environment Variable Strategy is responsible for finding a suitable
 * Biome binary from the system's PATH environment variable by looking for the
 * `biome` executable in each directory in the PATH.
 *
 * The PATH environment variable is scanned from left to right, and the first
 * `biome` executable found is returned, if any.
 */
export class PathEnvironmentVariableStrategy extends LocatorStrategy {
	async find(): Promise<Uri | undefined> {
		const path = process.env.PATH;

		if (!path) {
			return;
		}

		for (const dir of path.split(delimiter)) {
			const biome = Uri.joinPath(Uri.file(dir), binaryName);

			if (await fileExists(biome)) {
				return biome;
			}
		}

		return undefined;
	}
}
