import type { ExtensionContext } from "vscode";
import type { Project } from "./project";
import type { Session } from "./session";
import { updateStatusBar } from "./status-bar";

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
		| "restarting"
		| "started"
		| "running"
		| "stopping"
		| "stopped"
		| "error";

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

	context: ExtensionContext;

	hidden: boolean;
};

const _state: State = {
	state: "initializing",
	activeProject: undefined,
	sessions: new Map<Project, Session>([]),
	globalSession: undefined,
	hidden: false,
} as State;

/**
 * The state of the extension
 *
 * This state is a proxy to the actual state of the extension, which allows us
 * to listen for changes to the state and update the status bar accordingly.
 */
export const state = new Proxy(_state, {
	get: (target, prop) => Reflect.get(target, prop),
	set: (target, prop, value): boolean => {
		if (Reflect.set(target, prop, value)) {
			updateStatusBar();
			return true;
		}
		return false;
	},
});
