import type { Uri, WorkspaceFolder } from "vscode";

/**
 * Abstract Locator Strategy
 *
 * This abstract class defines the interface for locators, which are classes
 * that provide a strategy for finding the `biome` binary on the user's system.
 *
 * All locators must implement the `find` method, which returns the URI of the
 * `biome` binary, or a promise that resolves to one, or `undefined` if it could
 * not be found.
 */
export abstract class LocatorStrategy {
	/**
	 * Creates a new locator.
	 *
	 * Creates a new locator that searches for the `biome` binary in the context
	 * of the given workspace folder or URI, if provided.
	 *
	 * @param context - The workspace folder or URI to search in.
	 */
	constructor(protected readonly context?: Uri) {}

	/**
	 * Finds the `biome` binary using the locator's strategy.
	 *
	 * This method should be implemented by subclasses to provide a strategy for
	 * finding the `biome` binary on the user's system.
	 *
	 * @returns The URI of the `biome` binary, or a promise that resolves to one,
	 * or `undefined` if it could not be found.
	 */
	abstract find(): Uri | undefined | Promise<Uri | undefined>;
}
