import { describe, expect, test } from "bun:test";
import { collectVersions } from "./version";

describe("collectVersions", () => {
	const releases = [
		{ tag_name: "cli/1.0.0", published_at: "2024-04-20" },
		{ tag_name: "cli/1.0.1-alpha", published_at: "2024-04-21" },
		{ tag_name: "js-api/1.0.3", published_at: "2024-04-22" },
		{ tag_name: "cli/1.0.2", published_at: "2024-04-23" },
		{ tag_name: "cli/1.1.0-beta", published_at: "2024-04-24" },
	];

	test("collectVersions correctly splits into stable and nightly versions", () => {
		const { stableVersions, nightlyVersions } = collectVersions(releases);
		expect(stableVersions).toEqual(["1.0.2", "1.0.0"]);

		expect(nightlyVersions).toEqual(["1.1.0-beta", "1.0.1-alpha"]);
		expect(nightlyVersions[0]).toBe("1.1.0-beta"); // Most recent by date
	});

	test("collectVersions excludes non-cli releases", () => {
		const { stableVersions, nightlyVersions } = collectVersions(releases);
		expect(stableVersions.concat(nightlyVersions)).not.toContain("1.0.3");
	});
});
