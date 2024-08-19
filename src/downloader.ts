import { getAllVersions } from "@biomejs/version-utils";
import ky from "ky";
import {
	ProgressLocation,
	type QuickPickItem,
	Uri,
	window,
	workspace,
} from "vscode";
import { restart } from "./lifecycle";
import { debug, error, info } from "./logger";
import { state } from "./state";
import { binaryExtension, fileExists, platformPackageName } from "./utils";

export const downloadBiome = async (): Promise<Uri | undefined> => {
	const version = await promptVersionToDownload();

	if (!version) {
		return;
	}

	await window.withProgress(
		{
			title: `Downloading Biome ${version.label}`,
			location: ProgressLocation.Notification,
		},
		async () => await downloadBiomeVersion(version.label),
	);

	await restart();
};

const downloadBiomeVersion = async (
	version: string,
): Promise<Uri | undefined> => {
	const releases: {
		assets: { name: string; browser_download_url: string }[];
	} = await ky
		.get(
			`https://api.github.com/repos/biomejs/biome/releases/tags/cli/v${version}`,
		)
		.json();

	const asset = releases.assets.find((asset) => {
		return asset.name === platformPackageName;
	});

	debug(platformPackageName);
	debug(releases.assets.map((asset) => asset.name).join(", "));

	if (!asset) {
		window.showErrorMessage(
			`Could not find Biome ${version} for your platform.`,
		);
		return;
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
		`biome${binaryExtension}`,
	);

	try {
		await workspace.fs.writeFile(binPath, new Uint8Array(bin));
		info(`Downloaded Biome ${version} to ${binPath.fsPath}`);
		state.context.globalState.update("downloadedVersion", version);
	} catch (e) {
		window.showErrorMessage(`Failed to save Biome ${version}.`);
		error(e);
		return;
	}
};

/**
 * Retrieves the list of Biome CLI versions that have already been downloaded
 * to the global storage directory.
 */
const getDownloadedVersion = async () => {
	// Retrieve the list of downloaded version from the global state
	const version = state.context.globalState.get<string>("downloadedVersion");

	info(`Downloaded version: ${version}`);

	// For every version in the list, ensure that the version exists in the
	// global storage directory. If it does not exist, remove it from the list.

	if (
		await fileExists(
			Uri.joinPath(
				state.context.globalStorageUri,
				"bin",
				`biome${binaryExtension}`,
			),
		)
	) {
		return version;
	}

	// Save the updated list of downloaded versions
	state.context.globalState.update("downloadedVersion", version);

	return version;
};

/**
 * Prompts the user to select which versions of the Biome CLI to download
 *
 * This function will display a QuickPick dialog to the user, allowing them to
 * select which versions of the Biome CLI they would like to download. Versions
 * that have already been downloaded will be pre-selected.
 */
const promptVersionToDownload = async () => {
	// Get the list of versions
	const compileItems = async (): Promise<QuickPickItem[]> => {
		const downloadedVersion = await getDownloadedVersion();

		// Get the list of available versions
		const availableVersions = await getAllVersions(false);

		return availableVersions.map((version, index) => {
			return {
				label: version,
				description: index === 0 ? "(latest)" : "",
				detail:
					downloadedVersion === version
						? "(currently installed)"
						: "",
				alwaysShow: index < 3,
			};
		});
	};

	return window.showQuickPick(compileItems(), {
		title: "Select Biome version to download",
		placeHolder: "Select Biome version to download",
	});
};
