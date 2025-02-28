import { StatusBarAlignment, type StatusBarItem, window } from "vscode";
import { isEnabled } from "./config";
import { type State, state } from "./state";

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

	if (!isEnabled(state.activeProject?.folder) || state.hidden) {
		statusBar.item.hide();
		return;
	}

	const icon = getStateIcon(state);
	const text = getStateText();
	const version = getBiomeVersion();
	const tooltip = getStateTooltip();

	statusBar.item.text = `${icon} ${text} ${version}`.trim();
	statusBar.item.tooltip = tooltip;
	statusBar.item.show();
};

const getBiomeVersion = () => {
	const session = state.activeProject
		? state.sessions.get(state.activeProject)
		: state.globalSession;
	return session?.client.initializeResult?.serverInfo?.version ?? "";
};

const getStateText = (): string => {
	return "Biome";
};

const getStateTooltip = (): string => {
	switch (state.state) {
		case "initializing":
			return "Initializing";
		case "starting":
			return "Starting";
		case "restarting":
			return "Restarting";
		case "started":
			return "Up and running";
		case "stopping":
			return "Stopping";
		case "stopped":
			return "Stopped";
		case "error":
			return "Error";
	}
};

const getStateIcon = (state: State): string => {
	switch (state.state) {
		case "initializing":
			return "$(sync~spin)";
		case "starting":
			return "$(sync~spin)";
		case "restarting":
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
