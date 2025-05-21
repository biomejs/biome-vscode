import {
	StatusBarAlignment,
	type StatusBarItem,
	ThemeColor,
	window,
} from "vscode";
import { supportedLanguages } from "./constants";
import type Extension from "./extension";

export class StatusBar {
	/**
	 * The status bar item
	 */
	private statusBarItem: StatusBarItem;

	/**
	 * Create a new status bar
	 */
	constructor(public readonly extension: Extension) {
		this.statusBarItem = window.createStatusBarItem(
			"status",
			StatusBarAlignment.Right,
			100,
		);
	}

	/**
	 * Hide the status bar
	 */
	public hide() {
		this.statusBarItem.hide();
	}

	/**
	 * Show the status bar
	 */
	public show() {
		this.statusBarItem.show();
	}

	/**
	 * Update the status bar
	 *
	 * This method updates the status bar based on the state of the currently
	 * active Biome instance.
	 */
	public update() {
		// Hide the status bar if there isn't an active Biome instance or if
		// Biome is disabled in the active Biome instance.
		if (!this.extension.biome?.enabled) {
			this.hide();
			return;
		}

		// Hide the status bar item if there is no active text editor or if the
		// document uses an unsupported language.
		const languageId = window.activeTextEditor?.document.languageId;
		if (!languageId || !supportedLanguages.includes(languageId)) {
			this.hide();
			return;
		}

		// Reflect the state of the active Biome instance in the status bar item
		switch (this.extension.biome?.state) {
			case "starting":
				this.showStarting();
				break;
			case "ready":
				this.showReady();
				break;
			case "error":
				this.showError();
				break;
			case "disabled":
				this.hide();
				break;
			default:
				this.hide();
				return;
		}
	}

	/**
	 * Show the status bar as "starting"
	 *
	 * This renders the Biome logo along with a loading spinner to indicate
	 * that Biome is starting up.
	 */
	public showStarting() {
		this.statusBarItem.text = `$(biome-logo)$(loading~spin)`;
		this.statusBarItem.backgroundColor = undefined;
		this.statusBarItem.tooltip = "Biome is starting...";
		this.statusBarItem.show();
	}

	/**
	 * Show the status bar as "ready"
	 *
	 * This renders the Biome logo along with the version number of the
	 * currently active Biome instance.
	 *
	 * When the version is "0.0.0", it indicates that the Biome instance is
	 * running in development mode. In this case, the status bar item will
	 * have a warning background color.
	 */
	public showReady() {
		this.statusBarItem.command = {
			title: "Open logs",
			command: `biome.showLogs`,
		};
		this.statusBarItem.tooltip = "Show logs";

		if (this.extension.biome?.version === "0.0.0") {
			this.statusBarItem.text = `$(biome-logo) dev`;

			this.statusBarItem.backgroundColor = new ThemeColor(
				"statusBarItem.warningBackground",
			);

			this.statusBarItem.show();
			return;
		}

		this.statusBarItem.text = `$(biome-logo) ${this.extension.biome?.version}`;
		this.statusBarItem.backgroundColor = undefined;
		this.statusBarItem.show();
	}

	/**
	 * Show the status bar as "error"
	 *
	 * This renders the Biome logo along with a red background color to
	 * indicate that there was an error starting up Biome.
	 */
	public showError() {
		this.statusBarItem.text = `$(biome-logo)`;
		this.statusBarItem.tooltip =
			"There was an error starting Biome. Click here to view the logs.";
		this.statusBarItem.backgroundColor = new ThemeColor(
			"statusBarItem.errorBackground",
		);
		this.statusBarItem.command = {
			title: "Open logs",
			command: `biome.showLogs`,
		};
		this.statusBarItem.show();
	}
}
