import { commands, window, workspace } from "vscode";
import {
	downloadCommand,
	restartCommand,
	startCommand,
	stopCommand,
} from "./commands";
import { restart, start, stop } from "./lifecycle";
import { updateActiveProject } from "./project";
import { state } from "./state";

/**
 * Creates a new Biome extension
 *
 * This function is responsible for booting the Biome extension. It is called
 * when the extension is activated.
 */
export const createExtension = async () => {
	await start();
	registerUserFacingCommands();
	listenForConfigurationChanges();
	listenForActiveTextEditorChange();
};

/**
 * Destroys the Biome extension
 *
 * This function is responsible for shutting down the Biome extension. It is
 * called when the extension is deactivated and will trigger a cleanup of the
 * extension's state and resources.
 */
export const destroyExtension = async () => {
	await stop();
};

/**
 * Registers the extension's user-facing commands.
 */
const registerUserFacingCommands = () => {
	state.context.subscriptions.push(
		commands.registerCommand("biome.start", startCommand),
		commands.registerCommand("biome.stop", stopCommand),
		commands.registerCommand("biome.restart", restartCommand),
		commands.registerCommand("biome.download", downloadCommand),
	);
};

/**
 * Listens for configuration changes
 *
 * This function sets up a listener for configuration changes in the `biome`
 * namespace. When a configuration change is detected, the extension is
 * restarted to reflect the new configuration.
 */
const listenForConfigurationChanges = () => {
	state.context.subscriptions.push(
		workspace.onDidChangeConfiguration(async (event) => {
			if (event.affectsConfiguration("biome")) {
				// Only restart the extension if we're not alreary in the middle
				// of a restart or stop operation.
				if (
					state.state !== "restarting" &&
					state.state !== "stopping"
				) {
					// This is a hack to ensure that we don't restart the LSP session until
					// the workspace/didChangeConfiguration notification. This is necessary
					// to prevent a race condition where the configuration change is received
					// while the LSP session has already been stopped.
					await new Promise((resolve) => setTimeout(resolve, 1000));

					restart();
				}
			}
		}),
	);
};

/**
 * Listens for changes to the active text editor
 *
 * This function listens for changes to the active text editor and updates the
 * active project accordingly. This change is then reflected throughout the
 * extension automatically. Notably, this triggers the status bar to update
 * with the active project.
 */
const listenForActiveTextEditorChange = () => {
	state.context.subscriptions.push(
		window.onDidChangeActiveTextEditor((editor) => {
			updateActiveProject(editor);
		}),
	);

	updateActiveProject(window.activeTextEditor);
};
