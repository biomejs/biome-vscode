import { workspace } from "vscode";
import { type Project, createProjects } from "./project";
import { type Session, createSession } from "./session";
import type { StatusBar } from "./ui/status-bar/status-bar";
import { hasUntitledDocuments } from "./utils";

export type Extension = {
	sessions: Map<Project, Session>;
	globalSession?: Session;
	statusBar: StatusBar;
};

/**
 * Creates a new Biome extension
 *
 * This function creates a new Biome extension and initializes all of its
 * components.
 */
export const createExtension = async () => {
	// Create all projects
	const projects = await createProjects();

	// Create a new session for each project and store them in the map
	const sessions = new Map<Project, Session>();
	for (const project of projects) {
		const session = await createSession(project);
		if (session) {
			sessions.set(project, session);
		}
	}

	// Create a global session if an untitled file is open
	if (hasUntitledDocuments()) {
		const globalSession = await createSession();
	}

	// Return a function that shuts down the extension, and cleans up resources
	return async () => {
		for (const session of sessions.values()) {
			await session.client.stop();
		}
		sessions.clear();
	};
};
