import { chmodSync } from "node:fs";
import { getAllVersions } from "@biomejs/version-utils";
import ky from "ky";
import {
	ProgressLocation,
	type QuickPickItem,
	Uri,
	window,
	workspace,
} from "vscode";
import { error, info } from "./logger";
import { state } from "./state";
import {
	binaryExtension,
	binaryName,
	fileExists,
	platformPackageName,
} from "./utils";

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

	return (await getDownloadedVersion()).binPath;
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
		chmodSync(binPath.fsPath, 0o755);
		info(`Downloaded Biome ${version} to ${binPath.fsPath}`);
		state.context.globalState.update("downloadedVersion", version);
	} catch (e) {
		window.showErrorMessage(`Failed to save Biome ${version}.`);
		error(e);
		return;
	}
};

export const getDownloadedVersion = async (): Promise<
	{ version: string; binPath: Uri } | undefined
> => {
	// Retrieve the list of downloaded version from the global state
	const version = state.context.globalState.get<string>("downloadedVersion");

	const binPath = Uri.joinPath(
		state.context.globalStorageUri,
		"bin",
		binaryName(),
	);

	if (!(await fileExists(binPath))) {
		return;
	}

	return {
		version,
		binPath,
	};
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
		const downloadedVersion = (await getDownloadedVersion())?.version;

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
