import { error, info } from "./logger";
import { createGlobalSession, createProjectSessions } from "./session";
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
	info("✅ Biome extension stopped");
};

/**
 * Restarts the Biome extension
 */
export const restart = async () => {
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
		await createGlobalSession();
		await createProjectSessions();
	} catch (e) {
		error("Failed to start Biome extension", e);
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

	await state.globalSession?.client.stop();

	for (const session of state.sessions.values()) {
		await session.client.stop();
	}

	state.sessions.clear();
};
