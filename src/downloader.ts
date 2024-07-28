import { getAllVersions } from "@biomejs/version-utils";
import ky from "ky";
import { type QuickPickItem, Uri, window, workspace } from "vscode";
import { state } from "./state";
import { binaryName, fileExists } from "./utils";

export const downloadBiome = async () => {
	const versions = await promptVersionsToDownload();

	for (const version of versions) {
	}
};

const downloadBiomeVersion = async (version: string) => {
	const releases: {
		assets: { name: string; browser_download_url: string }[];
	} = await ky
		.get(
			`https://api.github.com/repos/biomejs/biome/releases/tags/cli/v${version}`,
		)
		.json();

	const asset = releases.assets.find((asset) => {
		return asset.name === binaryName;
	});

	if (!asset) {
		window.showErrorMessage(
			`Could not Biome ${version} for platform your platform.`,
		);
	}

	let bin: ArrayBuffer;
	try {
		const blob = await ky.get(asset.browser_download_url).blob();
		bin = await blob.arrayBuffer();
	} catch (error) {
		window.showErrorMessage(`Failed to download Biome ${version}.`);
		return;
	}

	const binPath = Uri.joinPath(
		state.context.globalStorageUri,
		"bin",
		`biome-${version}${process.platform === "win32" ? ".exe" : ""}`,
	);

	try {
		await workspace.fs.writeFile(binPath, new Uint8Array(bin));
	} catch (error) {
		window.showErrorMessage(`Failed to save Biome ${version}.`);
		return;
	}
};

/**
 * Retrieves the list of Biome CLI versions that have already been downloaded
 * to the global storage directory.
 */
const getDownloadedVersions = async () => {
	// Retrieve the list of downloaded version from the global state
	const versions = state.context.globalState.get<string[]>(
		"downloadedVersions",
		[],
	);

	// For every version in the list, ensure that the version exists in the
	// global storage directory. If it does not exist, remove it from the list.
	for (const version of versions) {
		const exists = await fileExists(
			Uri.joinPath(
				state.context.globalStorageUri,
				"bin",
				`biome-${version}${process.platform === "win32" ? ".exe" : ""}`,
			),
		);

		if (!exists) {
			versions.splice(versions.indexOf(version), 1);
		}
	}

	// Save the updated list of downloaded versions
	state.context.globalState.update("downloadedVersions", versions);

	return versions;
};

/**
 * Prompts the user to select which versions of the Biome CLI to download
 *
 * This function will display a QuickPick dialog to the user, allowing them to
 * select which versions of the Biome CLI they would like to download. Versions
 * that have already been downloaded will be pre-selected.
 */
const promptVersionsToDownload = async () => {
	// Get the list of versions
	const compileItems = async (): Promise<QuickPickItem[]> => {
		// Get the list of versions we already have
		const downloadedVersions = await getDownloadedVersions();

		// Get the list of available versions
		const availableVersions = await getAllVersions();

		return availableVersions.map((version, index) => {
			return {
				label: version,
				description: index === 0 ? "(latest)" : "",
				alwaysShow: index < 3,
				picked: downloadedVersions.includes(version),
			};
		});
	};

	return window.showQuickPick(compileItems(), {
		title: "Select Biome version to download",
		canPickMany: true,
		placeHolder: "Select Biome version to download",
	});
};
