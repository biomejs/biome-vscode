import { Uri } from "vscode";
import { binaryName, fileExists, packageName } from "../../utils";
import { LocatorStrategy } from "../strategy";

/**
 * Yarn Plug'n'Play Strategy
 *
 * The Yarn Plug'n'Play Strategy is responsible for finding a suitable Biome
 * binary from a Yarn Plug'n'Play (PnP) installation by looking for the `biome`
 * binary in the Yarn PnP installation.
 */
export class YarnPnPStrategy extends LocatorStrategy {
	async find(): Promise<Uri | undefined> {
		for (const extension of ["cjs", "js"]) {
			const uri = this.context;

			const yarnPnpFile = Uri.joinPath(uri, `.pnp.${extension}`);

			if (!(await fileExists(yarnPnpFile))) {
				continue;
			}

			try {
				const yarnPnpApi = require(yarnPnpFile.fsPath);

				const biomePackage = yarnPnpApi.resolveRequest(
					"@biomejs/biome/package.json",
					uri.fsPath,
				);

				if (!biomePackage) {
					continue;
				}

				return yarnPnpApi.resolveRequest(
					`${packageName}/${binaryName}`,
					biomePackage,
				);
			} catch {
				return undefined;
			}
		}
	}
}
