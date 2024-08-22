import { error, info } from "./logger";
import {
	clearTemporaryBinaries,
	createGlobalSession,
	createProjectSessions,
	destroySession,
} from "./session";
import { state } from "./state";

/**
 * Starts the Biome extension
 */
export const start = async () => {
	state.state = "starting";
	await doStart();
	state.state = "started";
	info("Biome extension started");
};

/**
 * Stops the Biome extension
 */
export const stop = async () => {
	state.state = "stopping";
	await doStop();
	state.state = "stopped";
	info("Biome extension stopped");
};

/**
 * Restarts the Biome extension
 */
export const restart = async () => {
	if (state.state === "restarting") {
		// If we are already restarting, we can skip the restart
		return;
	}
	state.state = "restarting";
	await doStop();
	await doStart();
	state.state = "started";
	info("Biome extension restarted");
};

/**
 * Runs the startup logic
 */
const doStart = async () => {
	try {
		await clearTemporaryBinaries();
		await createGlobalSession();
		await createProjectSessions();
	} catch (e) {
		error("Failed to start Biome extension");
		state.state = "error";
	}
};

/**
 * Runs the shutdown logic
 */
const doStop = async () => {
	// If we end up here following a configuration change, we need to wait
	// for the notification to be processed before we can stop the LSP session,
	// otherwise we will get an error. This is a workaround for a race condition
	// that occurs when the configuration change notification is sent while the
	// LSP session is already stopped.
	await new Promise((resolve) => setTimeout(resolve, 1000));

	if (state.globalSession) {
		destroySession(state.globalSession);
	}

	for (const session of state.sessions.values()) {
		await destroySession(session);
	}

	state.sessions.clear();
};
