import { gt } from "semver";
import {
	type ExtensionContext,
	type OutputChannel,
	StatusBarAlignment,
	type StatusBarItem,
	ThemeColor,
	window,
} from "vscode";
import { State } from "vscode-languageclient";
import type { LanguageClient } from "vscode-languageclient/node";
import { Commands } from "./commands";
import { getVersions } from "./downloader";

/**
 * Enumeration of all the status the extension can display
 *
 * The string value of the enum is the ThemeIcon ID to be displayer in the status
 * bar item when this status is active
 *
 * See https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
 * for a list of available icons
 */
enum Status {
	Pending = "refresh",
	Ready = "check",
	Inactive = "eye-closed",
	Warning = "warning",
	Error = "error",
}

export class StatusBar {
	private usingBundledBiome = false;
	private statusBarItem: StatusBarItem;
	private statusBarUpdateItem: StatusBarItem;

	private serverState: State = State.Starting;
	private isActive = false;
	private serverVersion = "";

	constructor(
		private readonly context: ExtensionContext,
		private readonly outputChannel?: OutputChannel,
	) {
		this.statusBarItem = window.createStatusBarItem(
			"biome.status",
			StatusBarAlignment.Right,
			-1,
		);

		this.statusBarItem.name = "Biome";
		this.statusBarItem.command = Commands.ServerStatus;

		this.statusBarUpdateItem = window.createStatusBarItem(
			"biome.update",
			StatusBarAlignment.Right,
			-2,
		);

		this.update();
		this.checkForUpdates(outputChannel);
	}

	public setServerState(client: LanguageClient, state: State) {
		this.serverState = state;

		if (state === State.Running) {
			this.serverVersion = client.initializeResult?.serverInfo?.version ?? "";
		} else {
			this.serverVersion = "";
		}

		this.update();
	}

	public setActive(isActive: boolean) {
		this.isActive = isActive;
		this.update();
	}

	private update() {
		let status: Status;
		if (this.serverState === State.Running) {
			if (this.isActive) {
				status = Status.Ready;
			} else {
				status = Status.Inactive;
			}
		} else if (this.serverState === State.Starting) {
			status = Status.Pending;
		} else {
			status = Status.Error;
		}

		this.statusBarItem.text = `$(${status}) Biome ${this.serverVersion} ${
			this.usingBundledBiome ? "(bundled)" : ""
		}`.trimEnd();

		switch (status) {
			case Status.Pending: {
				this.statusBarItem.tooltip = "Biome is initializing ...";
				break;
			}
			case Status.Ready: {
				this.statusBarItem.tooltip = "Biome is active";
				break;
			}
			case Status.Inactive: {
				this.statusBarItem.tooltip =
					"The current file is not supported or ignored by Biome";
				break;
			}
			// @ts-expect-error Reserved for future use
			case Status.Warning: {
				this.statusBarItem.tooltip = undefined;
				break;
			}
			case Status.Error: {
				this.statusBarItem.tooltip = "Biome encountered a fatal error";
				break;
			}
		}

		switch (status) {
			case Status.Error: {
				this.statusBarItem.color = new ThemeColor(
					"statusBarItem.errorForeground",
				);
				this.statusBarItem.backgroundColor = new ThemeColor(
					"statusBarItem.errorBackground",
				);
				break;
			}
			// @ts-expect-error Reserved for future use
			case Status.Warning: {
				this.statusBarItem.color = new ThemeColor(
					"statusBarItem.warningForeground",
				);
				this.statusBarItem.backgroundColor = new ThemeColor(
					"statusBarItem.warningBackground",
				);
				break;
			}
			default: {
				this.statusBarItem.color = undefined;
				this.statusBarItem.backgroundColor = undefined;
				break;
			}
		}

		if (this.usingBundledBiome) {
			this.statusBarItem.command = {
				title: "Change bundled Biome version",
				command: Commands.ChangeVersion,
			};
		} else {
			this.statusBarItem.command = Commands.ServerStatus;
		}

		this.statusBarItem.show();
	}

	public hide() {
		this.statusBarItem.hide();
	}

	public async setUsingBundledBiome(usingBundledBiome: boolean) {
		this.usingBundledBiome = usingBundledBiome;
		await this.checkForUpdates(this.outputChannel);
	}

	public async checkForUpdates(outputChannel?: OutputChannel) {
		// Only check for updates if we're using the bundled version
		if (!this.usingBundledBiome) {
			this.statusBarUpdateItem.hide();
			return;
		}

		const latestVersion = (await getVersions(this.context, outputChannel))?.[0];

		// If the latest version cannot be fetch, do not display the update
		// status bar item.
		if (!latestVersion) {
			this.statusBarUpdateItem.hide();
			return;
		}

		const hasUpdates = gt(
			latestVersion,
			this.context.globalState.get("bundled_biome_version") ?? "0.0.0",
		);

		if (this.usingBundledBiome && hasUpdates) {
			this.statusBarUpdateItem.name = "Biome update";
			this.statusBarUpdateItem.text =
				"Biome update available $(cloud-download)";

			this.statusBarUpdateItem.tooltip = "Click to update Biome";
			this.statusBarUpdateItem.backgroundColor = new ThemeColor(
				"statusBarItem.warningBackground",
			);
			this.statusBarUpdateItem.show();

			this.statusBarUpdateItem.command = {
				title: "Update Biome",
				command: Commands.UpdateBiome,
				arguments: [latestVersion],
			};
		} else {
			this.statusBarUpdateItem.hide();
		}

		this.update();
	}
}
