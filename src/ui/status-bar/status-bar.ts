import { StatusBarAlignment, type StatusBarItem, window } from "vscode";
import type { Extension } from "../../extension";
import { type State, state } from "../../state";

export class StatusBar {
	private item: StatusBarItem;

	constructor(private readonly extension: Extension) {}

	public async init(): Promise<void> {
		this.item = window.createStatusBarItem(
			"biome",
			StatusBarAlignment.Right,
			1,
		);

		state.addListener("state-changed", (state) => {
			this.update(state);
		});

		this.update(state);
	}

	private update(state: State): void {
		this.item.text = `${this.getStateIcon(state)} Biome (${state.activeRoot.session})`;
		this.item.tooltip = `Biome is ${state.state}`;
		this.item.show();
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
