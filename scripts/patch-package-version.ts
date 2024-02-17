import { $ } from "bun";

/**
 * Generates a nightly version identifier
 *
 * This helper function generates a nightly version identifier based on the
 * current date and time that looks like this: `{year}.{month}.{day}{hour}`.
 *
 * For example, if the current date is 2024-02-17 and the current time is 23:00,
 * the generated version would be `2024.02.2723`.
 *
 * This means that at most, there can be one nightly build per hour.
 */
const generateNightlyVersion = () => {
	const today = new Date();

	const year = today.getFullYear();
	const month = (today.getMonth() + 1).toString().padStart(2, "0");
	const day = today.getDate().toString().padStart(2, "0");
	const hour = today.getHours().toString().padStart(2, "0");

	return `${year}.${month}.${day}${hour}`;
};

/**
 * Patches the package.json file with a nightly version
 */
const patchPackageJson = async () => {
	const json = JSON.parse(await $`cat package.json`.text());
	json.version = generateNightlyVersion();
	await $`echo "${JSON.stringify(json, null, 4)}" > package.json`;
};

patchPackageJson();
