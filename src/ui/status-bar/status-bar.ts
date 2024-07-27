import {
	StatusBarAlignment,
	type StatusBarItem,
	window,
	workspace,
} from "vscode";
import { type State, state } from "../../state";
import { config } from "../../utils";

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

	if (!config("enable", { default: true }) || state.state === "disabled") {
		statusBar.item.hide();
		return;
	}

	const icon = getStateIcon(state);
	const text = getStateText();
	const tooltip = getStateTooltip();

	statusBar.item.text = `${icon} ${text}`.trim();
	statusBar.item.tooltip = tooltip;
	statusBar.item.show();
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
