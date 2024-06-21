import type { Uri, WorkspaceFolder } from "vscode";

export abstract class Locator {
	/**
	 * Finds the `biome` binary using the locator's strategy.
	 *
	 * @returns The URI of the `biome` binary, or a promise that resolves to one,
	 * or `undefined` if it could not be found.
	 */
	abstract find(
		folder: WorkspaceFolder,
	): Uri | undefined | Promise<Uri | undefined>;
}
