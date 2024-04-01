import { writeFileSync } from "node:fs";

/**
 * Generates a nightly version identifier
 *
 * This helper function generates a nightly version identifier based on the
 * current date and time that looks like this: `{year}.{month}.{day}{hour}{min}`.
 *
 * For example, if the current date is 2024-02-17 and the current time is 23:00,
 * the generated version would be `2024.02.272300`.
 */
const generateNightlyVersion = () => {
	const today = new Date(
		new Date().toLocaleString("en-US", { timeZone: "UTC" }),
	);

	const year = today.getFullYear();
	const month = today.getMonth() + 1;
	const day = today.getDate();
	const hour = String(today.getHours()).padStart(2, "0");
	const minute = String(today.getMinutes()).padStart(2, "0");

	return `${year}.${month}.${day}${hour}${minute}`;
};

/**
 * Patches the package.json file with a nightly version
 */
const patchPackageJson = async () => {
	const json = await import("../package.json");

	const nightlyVersion = generateNightlyVersion();

	writeFileSync(
		"package.json",
		JSON.stringify(
			{
				...json,
				version: nightlyVersion,
			},
			null,
			"\t",
		),
	);

	console.log(`Patched package.json with nightly version: ${nightlyVersion}`);
};

patchPackageJson();
