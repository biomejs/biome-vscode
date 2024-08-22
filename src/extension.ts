import { commands, window, workspace } from "vscode";
import {
	downloadCommand,
	restartCommand,
	startCommand,
	stopCommand,
} from "./commands";
import { restart, start, stop } from "./lifecycle";
import { info } from "./logger";
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
	listenForLockfilesChanges();
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

	info("User-facing commands registered");
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
				info("Configuration change detected.");
				if (!["restarting", "stopping"].includes(state.state)) {
					restart();
				}
			}
		}),
	);

	info("Started listening for configuration changes");
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

	info("Started listening for active text editor changes");

	updateActiveProject(window.activeTextEditor);
};

/**
 * Listens for changes to lockfiles in the workspace
 *
 * We use this watcher to detect changes to lockfiles and restart the extension
 * when they occur. We currently rely on this strategy to detect if Biome has been
 * installed or updated in the workspace until VS Code provides a better way to
 * detect this.
 */
const listenForLockfilesChanges = () => {
	const watcher = workspace.createFileSystemWatcher(
		"**/{package-lock.json,yarn.lock,bun.lockb,pnpm-lock.yaml}",
	);

	watcher.onDidChange((event) => {
		info(`Lockfile ${event.fsPath} changed.`);
		restart();
	});

	watcher.onDidCreate((event) => {
		info(`Lockfile ${event.fsPath} created.`);
		restart();
	});

	watcher.onDidDelete((event) => {
		info(`Lockfile ${event.fsPath} deleted.`);
		restart();
	});

	info("Started listening for lockfile changes");

	state.context.subscriptions.push(watcher);
};
