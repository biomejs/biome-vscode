import { createProjects } from "./project";
import { createSession } from "./session";
import { state } from "./state";
import { hasUntitledDocuments } from "./utils";

export type Extension = {
	cleanup: () => Promise<void>;
	restart: () => Promise<Extension>;
};

/**
 * Creates a new Biome extension
 *
 * This function creates a new Biome extension and initializes all of its
 * components.
 */
export const createExtension = async () => {
	const projects = await createProjects();

	for (const project of projects) {
		const session = await createSession(project);
		if (session) {
			state.sessions.set(project, session);
		}
	}

	// Create a global session if an untitled file is open
	if (hasUntitledDocuments()) {
		state.globalSession = await createSession();
	}

	// Register listeners for updating the status bar

	// Return a function that shuts down the extension, and cleans up resources
	const cleanup = async () => {
		// Stop global session, if it exists
		if (state.globalSession) {
			await state.globalSession?.client.stop();
			state.globalSession = undefined;
		}

		// Stop all project sessions
		for (const session of state.sessions.values()) {
			await session.client.stop();
		}
		state.sessions.clear();
	};

	const restart = async (): Promise<Extension> => {
		await cleanup();
		return await createExtension();
	};

	return {
		cleanup,
		restart,
	};
};
