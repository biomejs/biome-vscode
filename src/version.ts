import { parse, rcompare } from "semver";
import type { ExtensionContext, OutputChannel } from "vscode";

/**
 * Retrieves the list of versions of the CLI.
 *
 * The calls to the API are cached for 1 hour to prevent hitting the rate limit.
 */
export const getVersions = async (
	context: ExtensionContext,
	outputChannel?: OutputChannel,
): Promise<string[] | undefined> => {
	const cachedVersions = context.globalState.get<{
		expires_at: Date;
		versions: string[];
	}>("biome_versions_cache");

	// If the cache exists and is still valid, return it
	if (cachedVersions && new Date(cachedVersions.expires_at) > new Date()) {
		return cachedVersions.versions;
	}

	let releases = undefined;

	const response = await fetch(
		"https://api.github.com/repos/biomejs/biome/releases?per_page=100",
	);

	if (!response.ok) {
		outputChannel?.appendLine(
			`Failed to fetch Biome versions from GitHub API: ${response.statusText}`,
		);
		return undefined;
	}

	releases = (await response.json()) as {
		tag_name: string;
		published_at: string;
	}[];

	const { stableVersions, nightlyVersions } = collectVersions(releases);
	const versions = [...stableVersions, ...nightlyVersions];

	// Cache the result for 1 hour
	await context.globalState.update("biome_versions_cache", {
		expires_at: new Date(Date.now() + 60 * 60 * 1000),
		versions,
	});

	return versions;
};

export const collectVersions = (
	releases: {
		tag_name: string;
		published_at: string;
	}[],
) => {
	const allReleases = releases
		.filter((release) => release.tag_name.startsWith("cli/"))
		.flatMap((release) => {
			const date = new Date(release.published_at);
			const version = parse(release.tag_name.replace("cli/", ""));
			return version == null ? [] : { date, version };
		});

	const stableVersions = allReleases
		.filter((release) => release.version.prerelease.length === 0)
		.sort((a, b) => rcompare(a.version, b.version))
		.map((release) => release.version.version);

	const nightlyVersions = allReleases
		.filter((release) => release.version.prerelease.length > 0)
		.sort((a, b) => rcompare(a.version, b.version))
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.map((release) => release.version.version);

	return { stableVersions, nightlyVersions };
};
