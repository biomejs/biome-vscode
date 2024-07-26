import { ProgressLocation, window, workspace } from "vscode";
import { error, info } from "./logger";
import { type Project, createProjects } from "./project";
import { createSession } from "./session";
import { state } from "./state";
import { config, hasUntitledDocuments } from "./utils";

/**
 * Creates a new Biome extension
 *
 * This function creates a new Biome extension and initializes all of its
 * components.
 */
export const createExtension = async (): Promise<void> => {
	// Listen for configuration changes, so we can restart the extension
	// when the configuration changes. This is the first thing we do to ensure
	// that we can restart the extension even when the user had it disabled
	// initially.
	workspace.onDidChangeConfiguration(async (event) => {
		if (event.affectsConfiguration("biome")) {
			await restart();
		}
	});

	// If the extension is or became disabled globally, stop it now.
	if (
		config<boolean>("enabled", { level: "global", default: true }) === false
	) {
		await stop();
		return;
	}

	// Start the extension
	await start();
};

/**
 * Destroys the Biome extension
 */
export const destroyExtension = async (): Promise<void> => {
	await stop();
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
		}
	});

	workspace.onDidCloseTextDocument(async (document) => {
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
	info("Setting up project sessions");
	for (const project of projects) {
		info("=== Creating session for project ===");
		const session = await createSession(project);
		if (session) {
			info(
				`Created session for project ${project.path} in workspace ${project.folder.name}.`,
			);
			state.sessions.set(project, session);
		} else {
			error(
				`Failed to create session for project ${project.path} in workspace ${project.folder.name}.`,
			);
		}
	}
};

/**
 * Starts the Biome extension
 */
const start = async () => {
	info("🚀 Starting Biome extension");
	window.withProgress(
		{
			title: "Starting Biome extension",
			location: ProgressLocation.Notification,
		},
		async () => {
			await setupGlobalSession();
			const projects = await createProjects();
			await setupProjectSessions(projects);
		},
	);
};

/**
 * Stops the biome extension
 */
const stop = async () => {
	info("Stopping Biome extension");
	window.withProgress(
		{
			title: "Stopping Biome extension",
			location: ProgressLocation.Notification,
		},
		async () => {
			await state.globalSession?.client.stop();
			for (const session of state.sessions.values()) {
				await session.client.stop();
			}
			state.sessions.clear();
		},
	);
};

/**
 * Restarts the Biome extension
 */
const restart = async () => {
	await stop();
	await start();
};
