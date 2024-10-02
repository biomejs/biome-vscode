import { ConfigurationTarget, Uri, workspace } from "vscode";
import { downloadBiome } from "./downloader";
import { restart, start, stop } from "./lifecycle";
import { info } from "./logger";
import { state } from "./state";
import { clearTemporaryBinaries } from "./utils";
/**
 * Starts the Biome extension
 *
 * This command is exposed to the users as a command in the command palette.
 */
export const startCommand = async () => {
	await start();
};

/**
 * Stops the Biome extension
 *
 * This command is exposed to the users as a command in the command palette.
 */
export const stopCommand = async () => {
	await stop();
};

/**
 * Restarts the Biome extension
 *
 * This command is exposed to the users as a command in the command palette.
 */
export const restartCommand = async () => {
	await restart();
};

/**
 * Installs a pre-built version of the Biome CLI
 *
 * This command is exposed to the users as a command in the command palette.
 *
 * When calling this command, the user will be prompted to select a version of
 * the Biome CLI to install. The selected version will be downloaded and stored
 * in VS Code's global storage directory.
 */
export const downloadCommand = async () => {
	await downloadBiome();
};

export const resetCommand = async () => {
	await stop();
	await clearTemporaryBinaries();
	await state.context.globalState.update("downloadedVersion", undefined);
	info("Biome extension was reset");
	await start();
};

export const initializeWorkspaceCommand = async (args: Uri) => {
	const subconfigs = [
		"[javascript]",
		"[typescript]",
		"[typescriptreact]",
		"[javascriptreact]",
		"[json]",
		"[jsonc]",
		"[vue]",
		"[astro]",
		"[svelte]",
		"[css]",
		"[graphql]",
	].join("");

	// Scopes the config down to the current workspace folder
	const config = workspace.getConfiguration(undefined, Uri.parse(args.path));
	try {
		const configsToUpdate = [
			{ name: "biome.enabled", value: true },
			{
				name: "editor.codeActionsOnSave",
				value: {
					...config.get<object | undefined>(
						"editor.codeActionsOnSave",
					),
					"source.organizeImports.biome": "always",
					"quickfix.biome": "always",
				},
			},
			{ name: "editor.defaultFormatter", value: "biomejs.biome" },
			{
				name: `${subconfigs}`,
				value: { "editor.defaultFormatter": "biomejs.biome" },
			},
		];
		for (const { name, value } of configsToUpdate) {
			await config.update(
				name,
				value,
				ConfigurationTarget.WorkspaceFolder,
			);
		}

		info("Workspace configuration updated");
	} catch (e) {}
};
