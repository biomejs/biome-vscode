import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Uri } from "vscode";
import { binaryName, fileExists, getPackageName } from "../../utils";
import { LocatorStrategy } from "../strategy";

/**
 * Node Modules Locator Strategy
 *
 * The Node Modules Locator Strategy is responsible for finding a suitable
 * Biome binary from the project's dependencies in the `node_modules` directory
 * by looking for a `@biomejs/cli-{platform}-{arch}{libc}` package, which would
 * usually have been installed as an optional dependency by the user's package
 * manager.
 *
 * The locator is implemented in such a way that it should work with with most
 * if not all packages managers, including npm, pnpm, yarn and bun. Using node's
 * built-in `createRequire`, we create a require function that is scoped to the
 * root `@biomejs/biome` package, which allows us to resolve the platform-specific
 * `@biomejs/cli-{platform}-{arch}{libc}` package. We then resolve the path to the
 * `biome` binary by looking for the `biome` executable in the root of the package.
 */
export class NodeModulesStrategy extends LocatorStrategy {
	async find(folder?: Uri): Promise<Uri | undefined> {
		try {
			const biomePackage = createRequire(
				require.resolve("@biomejs/biome/package.json", {
					paths: [folder.fsPath],
				}),
			);

			// We need to resolve the package.json file here because the
			// platform-specific packages do not have an entry point.
			const binPackage = dirname(
				biomePackage.resolve(`${getPackageName()}/package.json`),
			);

			const binPath = Uri.file(join(binPackage, binaryName));

			if (!(await fileExists(binPath))) {
				return undefined;
			}

			return binPath;
		} catch {
			return undefined;
		}
	}
}
