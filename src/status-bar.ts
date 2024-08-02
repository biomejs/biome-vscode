import { StatusBarAlignment, type StatusBarItem, window } from "vscode";
import { type State, state } from "./state";
import { config } from "./utils";

export type StatusBar = {
	item: StatusBarItem;
};

const createStatusBar = (): StatusBar => {
	const item = window.createStatusBarItem(
		"biome",
		StatusBarAlignment.Right,
		1,
	);

	return { item };
};

export const updateStatusBar = () => {
	if (!state) {
		return;
	}

	if (
		!config("enabled", { default: true }) ||
		state.state === "disabled" ||
		state.hidden
	) {
		statusBar.item.hide();
		return;
	}

	const icon = getStateIcon(state);
	const text = getStateText();
	const version = getBiomeVersion();
	const tooltip = getStateTooltip();
	const folder = state.activeProject?.folder?.name
		? `($(folder) ${state.activeProject?.folder.name})`
		: "";

	statusBar.item.text = `${icon} ${text} ${version}`.trim();
	statusBar.item.tooltip = tooltip;
	statusBar.item.show();
};

const getBiomeVersion = () => {
	const session = state.activeProject
		? state.sessions.get(state.activeProject)
		: state.globalSession;
	return session?.client.initializeResult?.serverInfo.version;
};

const getStateText = (): string => {
	switch (state.state) {
		case "initializing":
			return "Biome";
		case "starting":
			return "Biome";
		case "started":
			return "Biome";
		case "stopping":
			return "Biome";
		case "stopped":
			return "Biome";
		default:
			return "Biome";
	}
};

const getStateTooltip = () => {
	switch (state.state) {
		case "initializing":
			return "Initializing";
		case "starting":
			return "Starting";
		case "started":
			return "Up and running";
		case "stopping":
			return "Stopping";
		case "stopped":
			return "Stopped";
		case "error":
			return "Error";
		default:
			return "Biome";
	}
};

const getStateIcon = (state: State): string => {
	switch (state.state) {
		case "initializing":
			return "$(sync~spin)";
		case "starting":
			return "$(sync~spin)";
		case "started":
			return "$(check)";
		case "stopping":
			return "$(sync~spin)";
		case "stopped":
			return "$(x)";
		case "error":
			return "$(error)";
		default:
			return "$(question)";
	}
};

export const statusBar = createStatusBar();
