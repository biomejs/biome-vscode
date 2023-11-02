import { Octokit } from "octokit";
import { ExtensionContext, Uri, window, workspace } from "vscode";
import { coerce, rcompare } from "semver";
import { ofetch } from "ofetch";
import { chmodSync } from "node:fs";

export const selectAndDownload = async (context: ExtensionContext) => {
	const versions = await getVersions(context);
	const version = await askVersion(versions);
	await download(version, context);
};

/**
 * Download the Biome CLI from GitHub
 *
 * @param version The version to download
 */
const download = async (version: string, context: ExtensionContext) => {
	// Find the correct asset to download
	const octokit = new Octokit();

	const release = await octokit.request(
		"GET /repos/{owner}/{repo}/releases/tags/{tag}",
		{
			owner: "biomejs",
			repo: "biome",
			tag: `cli/v${version}`,
		},
	);

	const platformArch = `${process.platform}-${process.arch}`;

	// Find the asset for the current platform
	const asset = release.data.assets.find(
		(asset) =>
			asset.name ===
			`biome-${platformArch}${process.platform === "win32" ? ".exe" : ""}`,
	);

	if (!asset) {
		window.showErrorMessage(
			`The specified version is not available for your platform/architecture (${platformArch}).`,
		);
	}

	const bin = await ofetch(asset.browser_download_url, {
		responseType: "arrayBuffer",
	});

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
};

/**
 * Display the VS Code prompt for selection the version
 */
const askVersion = async (versions: string[]): Promise<string> => {
	const options = versions.map((version, index) => ({
		label: version,
		description: index === 0 ? "(latest)" : "",
	}));

	const result = await window.showQuickPick(options, {
		placeHolder: "Select the version of the biome CLI to install",
	});

	return result?.label;
};

/**
 * Retrieves the list of versions of the CLI.
 *
 * The calls to the API are cached for 1 hour to prevent hitting the rate limit.
 */
const getVersions = async (context: ExtensionContext): Promise<string[]> => {
	const cachedVersions = context.globalState.get<{
		expires_at: Date;
		versions: string[];
	}>("biome_versions_cache");

	// If the cache exists and is still valid, return it
	if (cachedVersions && new Date(cachedVersions.expires_at) > new Date()) {
		return cachedVersions.versions;
	}

	const octokit = new Octokit();

	// Retrieve all tags on the biome repository
	const tags = await octokit.request("GET /repos/{owner}/{repo}/tags", {
		owner: "biomejs",
		repo: "biome",
		per_page: 50,
	});

	const versions = tags.data
		.filter((tag) => tag.name.startsWith("cli/"))
		.map((tag) => tag.name.replace("cli/", ""))
		.map((tag) => coerce(tag))
		.sort((a, b) => rcompare(a, b))
		.filter((tag) => tag?.version !== null)
		.map((tag) => tag?.version);

	// Cache the result for 1 hour
	await context.globalState.update("biome_versions_cache", {
		expires_at: new Date(Date.now() + 60 * 60 * 1000),
		versions,
	});

	return versions;
};
