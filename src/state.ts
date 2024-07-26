import type { Project } from "./project";
import type { Session } from "./session";

export type State = {
	/**
	 * The current state of the extension
	 *
	 * The state of the extension is used to determine what the extension is
	 * currently doing. This is used to provide context to the user in other
	 * parts of the extension.
	 */
	state:
		| "initializing"
		| "disabled"
		| "starting"
		| "started"
		| "running"
		| "stopping"
		| "stopped";

	/**
	 * The Biome project that is currently active
	 *
	 * This is the project that is currently being worked on by the user in the
	 * text editor. This is used to provide context to the user in other parts
	 * of the extension.
	 */
	activeProject?: Project;

	sessions: Map<Project, Session>;

	globalSession?: Session;
};

export const state: State = {
	state: "initializing",
	sessions: new Map<Project, Session>([]),
	globalSession: undefined,
} as State;
