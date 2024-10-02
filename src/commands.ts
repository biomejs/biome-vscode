import { ConfigurationTarget, workspace } from "vscode";
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

export const initializeWorkspaceCommand = async () => {
	const subconfigs = [
		"[javascript]",
		"[typescript]",
		"[typescriptreact]",
		"[javascriptreact]",
		"[json]",
		"[jsonc]",
	].join("");

	// Get the root workspace configuration
	const config = workspace.getConfiguration();
	try {
		// Set biome to enabled
		await config.update(
			"biome.enabled",
			true,
			ConfigurationTarget.Workspace,
		);

		await config.update("editor.codeActionsOnSave", {
			...config.get("editor.codeActionsOnSave"),
			"source.organizeImports.biome": "always",
			"quickfix.biome": "always",
		});

		// Set it to default formatter
		await config.update(
			"editor.defaultFormatter",
			"biomejs.biome",
			ConfigurationTarget.Workspace,
		);
		// Set it to default formatter for all languages it supports
		await config.update(
			`${subconfigs}`,
			{ "editor.defaultFormatter": "biomejs.biome" },
			ConfigurationTarget.Workspace,
		);
		info("Workspace configuration updated");
	} catch (e) {}
};
