import { ProgressLocation, window } from "vscode";
import { error, info } from "./logger";
import { createGlobalSession, createProjectSessions } from "./session";
import { state } from "./state";

/**
 * Starts the Biome extension
 */
export const start = async () => {
	info("🚀 Starting Biome extension");
	state.state = "starting";
	await doStart();
	state.state = "started";
	info("✅ Starting Biome extension");
};

/**
 * Stops the Biome extension
 */
export const stop = async () => {
	info("🛑 Stopping Biome extension");
	state.state = "stopping";
	await doStop();
	state.state = "stopped";
	info("✅ Biome extension stopped");
};

/**
 * Restarts the Biome extension
 */
export const restart = async () => {
	info("🔄 Restarting Biome extension");
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
	info("✅ Biome extension restarted");
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
	await state.globalSession?.client.stop();
	for (const session of state.sessions.values()) {
		await session.client.stop();
	}
	state.sessions.clear();
};
