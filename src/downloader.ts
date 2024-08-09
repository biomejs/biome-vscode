import { chmodSync } from "node:fs";
import { fetch } from "undici";
import {
	type ExtensionContext,
	type OutputChannel,
	ProgressLocation,
	Uri,
	commands,
	window,
	workspace,
} from "vscode";
import { Commands } from "./commands";
import { getVersions } from "./version";

export const selectAndDownload = async (
	context: ExtensionContext,
	outputChannel?: OutputChannel,
): Promise<string | undefined> => {
	const versions = await window.withProgress(
		{
			location: ProgressLocation.Notification,
			title: "Fetching Biome versions",
			cancellable: false,
		},
		async () => {
			return await getVersions(context, outputChannel);
		},
	);

	if (!versions) {
		return;
	}

	const version = await askVersion(versions);

	if (!version) {
		return undefined;
	}

	return await window.withProgress(
		{
			location: ProgressLocation.Notification,
			title: `Downloading Biome ${version}`,
			cancellable: false,
		},
		async () => {
			await commands.executeCommand(Commands.StopServer);
			await download(version, context);
			await commands.executeCommand(Commands.RestartLspServer);
			return version;
		},
	);
};

export const updateToLatest = async (
	context: ExtensionContext,
	outputChannel?: OutputChannel,
) => {
	await window.withProgress(
		{
			location: ProgressLocation.Notification,
			title: "Updating Biome version",
			cancellable: false,
		},
		async () => {
			const versions = await getVersions(context, outputChannel);
			if (!versions) {
				return;
			}
			const version = versions[0];
			await commands.executeCommand(Commands.StopServer);
			await download(version, context);
			await commands.executeCommand(Commands.RestartLspServer);
		},
	);
};

/**
 * Download the Biome CLI from GitHub
 *
 * @param version The version to download
 */
const download = async (version: string, context: ExtensionContext) => {
	const releases = (await (
		await fetch(
			`https://api.github.com/repos/biomejs/biome/releases/tags/cli/v${version}`,
		)
	).json()) as {
		assets: { name: string; browser_download_url: string }[];
	};

	const assetName = `biome-${process.platform}-${process.arch}${
		process.platform === "linux" ? "-musl" : ""
	}${process.platform === "win32" ? ".exe" : ""}`;

	// Find the asset for the current platform
	const asset = releases.assets.find((asset) => asset.name === assetName);

	if (!asset) {
		window.showErrorMessage(
			`The specified version is not available for your system (${assetName}).`,
		);
		return;
	}

	let bin: ArrayBuffer;
	try {
		const blob = await fetch(asset.browser_download_url);
		bin = await blob.arrayBuffer();
	} catch {
		window.showErrorMessage(
			`Could not download the binary for your system (${assetName}).`,
		);
		return;
	}

	// Write binary file to disk
	await workspace.fs.writeFile(
		Uri.joinPath(
			context.globalStorageUri,
			"server",
			`biome${process.platform === "win32" ? ".exe" : ""}`,
		),
		new Uint8Array(bin),
	);

	// Make biome executable
	chmodSync(
		Uri.joinPath(
			context.globalStorageUri,
			"server",
			`biome${process.platform === "win32" ? ".exe" : ""}`,
		).fsPath,
		0o755,
	);

	// Record latest version
	await context.globalState.update("bundled_biome_version", version);
};

/**
 * Display the VS Code prompt for selection the version
 */
const askVersion = async (versions: string[]): Promise<string | undefined> => {
	const options = versions.map((version, index) => ({
		label: version,
		description: index === 0 ? "(latest)" : "",
	}));

	const result = await window.showQuickPick(options, {
		placeHolder: "Select the version of the biome CLI to install",
	});

	return result?.label;
};
