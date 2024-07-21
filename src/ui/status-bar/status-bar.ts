import { StatusBarAlignment, type StatusBarItem, window } from "vscode";
import type { Extension } from "../../extension";
import { type State, state } from "../../state";
import { config, logger } from "../../utils";

export class StatusBar {
	private item: StatusBarItem;

	constructor(private readonly extension: Extension) {}

	public async init(): Promise<void> {
		logger.debug("Initializing status bar");

		this.item = window.createStatusBarItem(
			"biome",
			StatusBarAlignment.Right,
			1,
		);

		state.addListener("state-changed", (state) => {
			this.update(state);
		});

		this.update(state);

		logger.debug("Status bar initialized");
	}

	private update(state: State): void {
		// If the extension is disabled in the current context, hide the status bar.
		if (!config("enable", { default: true })) {
			this.item.hide();
			return;
		}

		const { text, tooltip } = this.getStateTextAndTooltip(state);

		this.item.text = `${this.getStateIcon(state)} ${text}`.trim();
		this.item.tooltip = tooltip;
		this.item.show();
	}

	/**
	 * Returns the text to display for the given state.
	 */
	private getStateTextAndTooltip(state: State): {
		text: string;
		tooltip: string;
	} {
		switch (state.state) {
			case "initializing":
				return {
					text: "Biome",
					tooltip: "Initializing",
				};
			case "starting":
				return {
					text: "Biome",
					tooltip: "Starting",
				};
			case "started":
				return {
					text: "Biome",
					tooltip: "Up and running",
				};
			case "stopping":
				return {
					text: "Biome",
					tooltip: "Stopping",
				};
			case "stopped":
				return {
					text: "Biome",
					tooltip: "Stopped",
				};
			default:
				return {
					text: "Biome",
					tooltip: "Biome",
				};
		}
	}

	/**
	 * Returns the icon for the given state.
	 */
	private getStateIcon(state: State): string {
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
		}
	}
}
