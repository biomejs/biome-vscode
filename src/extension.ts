import {
	type ExtensionContext,
	ProgressLocation,
	type TextEditor,
	commands,
	window,
	workspace,
} from "vscode";
import {
	downloadCommand,
	restartCommand,
	startCommand,
	stopCommand,
} from "./commands";
import { clear, error, info } from "./logger";
import { type Project, createProjects } from "./project";
import { type Session, createSession } from "./session";
import { state } from "./state";
import {
	config,
	hasUntitledDocuments,
	isEnabled,
	supportedLanguages,
} from "./utils";

/**
 * Creates a new Biome extension
 *
 * This function creates a new Biome extension and initializes all of its
 * components.
 */
export const createExtension = async (
	context: ExtensionContext,
): Promise<void> => {
	clear();
	state.state = "initializing";
	state.context = context;

	registerCommands();
	listenForConfigurationChanges();

	if (isEnabled()) {
		await start();
		listenForActiveTextEditorChange();
	} else {
		await stop();
	}
};

/**
 * Destroys the Biome extension
 */
export const destroyExtension = async (): Promise<void> => {
	info("🛑 Destroying Biome extension");
	await stop();
	info("🛑 Biome extension destroyed");
};

/**
 * Manages the lifecycle of the global session
 *
 * This function will create a global session if at least one untitled file is
 * open. Addititionally, it will start and stop the global session as untitled
 * files are opened and closed.
 */
const setupGlobalSession = async () => {
	if (hasUntitledDocuments()) {
		info("Found untitled files at startup, creating global session.");
		state.globalSession = await createSession();
	}

	// Listen for untitled files being opened
	workspace.onDidOpenTextDocument(async (document) => {
		// If the workspace has untitled files open and there is no global session
		// create a new global session
		if (hasUntitledDocuments() && !state.globalSession) {
			info("Found untitle files, creating global session.");
			state.globalSession = await createSession();
			state.globalSession?.client.start();
		}
	});

	workspace.onDidCloseTextDocument(async () => {
		// If the workspace has no untitled files open and there is a global session
		// stop and destroy the global session
		if (!hasUntitledDocuments() && state.globalSession) {
			info("No untitled files left, stopping global session.");
			await state.globalSession.client.stop();
			state.globalSession = undefined;
		}
	});
};

/**
 * Sets up project sessions
 *
 * This function will create a session for each project.
 */
const setupProjectSessions = async (projects: Project[]) => {
	if (projects.length === 0) {
		info("No projects found.");
		return;
	}

	info("Setting up project sessions");
	const sessions = new Map<Project, Session>([]);
	for (const project of projects) {
		info("=== Creating session for project ===");
		const session = await createSession(project);
		if (session) {
			info(`Created session for project ${project.path}.`);
			sessions.set(project, session);

			await session.client.start();
		} else {
			error(`Failed to create session for project ${project.path}`);
		}
	}
	state.sessions = sessions;
};

/**
 * Starts the Biome extension
 */
export const start = async () => {
	if (config("enabled", { default: true }) === false) {
		info("Biome extension is disabled, skipping start.");
		return;
	}

	info("🚀 Starting Biome extension");
	state.state = "starting";
	await doStart();
	state.state = "started";
};

const doStart = async () => {
	try {
		await setupGlobalSession();
		const projects = await createProjects();
		await setupProjectSessions(projects);
	} catch (e) {
		error("Failed to start Biome extension", e);
		state.state = "error";
	}
};

/**
 * Stops the biome extension
 */
export const stop = async () => {
	info("Stopping Biome extension");
	state.state = "stopping";
	await window.withProgress(
		{
			title: "Stopping Biome extension",
			location: ProgressLocation.Notification,
		},
		doStop,
	);
	state.state = "stopped";
};

const doStop = async () => {
	await state.globalSession?.client.stop();
	for (const session of state.sessions.values()) {
		await session.client.stop(20);
	}
	state.sessions.clear();
};

/**
 * Restarts the Biome extension
 */
export const restart = async () => {
	info("Restarting Biome extension");
	state.state = "restarting";
	await window.withProgress(
		{
			title: "Restarting Biome extension",
			location: ProgressLocation.Notification,
		},
		async () => {
			await doStop();
			await doStart();
		},
	);
	state.state = "running";
	await doStop();
	await start();
};

/**
 * Registers the extension's commands
 *
 * This function is responsible for registering the extension's commands with
 * the VS Code API. Commands registered here are not necessarily exposed to the
 * end user in the command palette, but can be invoked programmatically, or
 * bound to keybindings.
 *
 * To expose a command to the end user, you must add it to the
 * `contributes.commands` section of the `package.json` file.
 */
const registerCommands = () => {
	state.context.subscriptions.push(
		commands.registerCommand("biome.start", startCommand),
		commands.registerCommand("biome.stop", stopCommand),
		commands.registerCommand("biome.restart", restartCommand),
		commands.registerCommand("biome.download", downloadCommand),
		commands.registerCommand("biome.get-projects", getProjectsCommand),
	);
};

/**
 * Listens for configuration changes
 *
 * This function sets up a listener for configuration changes in the `biome`
 * namespace. When a configuration change is detected, the extension is
 * restarted to reflect the new configuration.
 */
const listenForConfigurationChanges = async () => {
	state.context.subscriptions.push(
		workspace.onDidChangeConfiguration(async (event) => {
			if (event.affectsConfiguration("biome")) {
				// This hack is necessary to prevent a race condition where VS Code attempts to
				// send a workspace/didChangeConfiguration notification to the LSP sessions while
				// they are being destroyed, resulting in an error being show in a popup. I'm yet
				// to find a better way to handle this, but for now this seems to work.
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// If the configuration change resulted in the extension being disabled, we stop
				// the extension and exit.
				if (config("enabled", { default: true }) === false) {
					await stop();
					return;
				}

				await restart();
			}
		}),
	);
};

/**
 * Updates the currently active project
 *
 * This function updates the currently active project based on the active text
 * editor by checking if the document in the active text editor is part of a
 * project. If it is, the active project is updated to reflect this change.
 */
const updateActiveProject = (editor: TextEditor) => {
	const project = [...state.sessions.keys()].find((project) => {
		return editor?.document?.uri.fsPath.startsWith(project.path.fsPath);
	});

	state.hidden =
		editor?.document === undefined ||
		!supportedLanguages.includes(editor.document.languageId);

	state.activeProject = project;
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
