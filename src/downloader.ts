import { getAllVersions } from "@biomejs/version-utils";
import { type QuickPickItem, window } from "vscode";
import { info } from "./logger";

export const downloadBiome = async () => {
	const versions = await promptVersionsToDownload();
	info(`Downloading Biome CLI versions: ${versions.join(", ")}`);
};

/**
 * Prompts the user to select which versions of the Biome CLI to download
 *
 * This function will display a QuickPick dialog to the user, allowing them to
 * select which versions of the Biome CLI they would like to download. Versions
 * that have already been downloaded will be pre-selected.
 */
const promptVersionsToDownload = async () => {
	// Get the list of versions we already have

	// Get the list of versions
	const compileItems = async (): Promise<QuickPickItem[]> => {
		const allVersions = await getAllVersions();
		return allVersions.map((version, index) => {
			return {
				label: version,
				description: index === 0 ? "(latest)" : "",
				alwaysShow: index < 3,
			};
		});
	};

	return window.showQuickPick(compileItems(), {
		title: "Select Biome version to download",
		canPickMany: true,
		placeHolder: "Select Biome version to download",
	});
};
