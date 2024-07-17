import { EventEmitter } from "node:events";
import { workspace } from "vscode";
import type { Root } from "./root";

class State extends EventEmitter {
	/**
	 * The current state of the extension
	 */
	private _state:
		| "initializing"
		| "starting"
		| "started"
		| "running"
		| "stopping"
		| "stopped" = "initializing";

	/**
	 * The currently active Biome root
	 */
	private _activeRoot?: Root;

	/**
	 * The current context of the extension
	 *
	 * When VS Code is running in a single-file context, there won't be any
	 * workspace folders. Additionally, if the context was to change, VS Code
	 * would fully reload, so we don't need to track this value. We merely use
	 * it to provide context to the user in other parts of the extension.
	 */
	public get context(): "single-file" | "workspace" {
		return workspace.workspaceFolders ? "workspace" : "single-file";
	}

	/**
	 * The current state of the extension
	 */
	public get state() {
		return this._state;
	}

	/**
	 * Sets the current state of the extension
	 */
	public set state(state) {
		this._state = state;
		this.emit("stateChanged", state);
	}

	/**
	 * The currently active Biome root
	 */
	public get activeRoot() {
		return this._activeRoot;
	}

	/**
	 * Sets the currently active Biome root
	 */
	public set activeRoot(root: Root | undefined) {
		this._activeRoot = root;
		this.emit("activeRootChanged", root);
	}
}

export const state = new State();
