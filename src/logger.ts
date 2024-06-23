import { window } from "vscode";
import { displayName } from "../package.json";

/**
 * Logger
 *
 * A general-purpose logger instance that can be used throughout the extension.
 *
 * Messages logged to this logger will be displayed in the `Biome` output
 * channel in the Output panel. This logger respects the user's settings for
 * logging verbosity, so only messages with the appropriate log level will be
 * displayed.
 */
export const logger = window.createOutputChannel(displayName, {
	log: true,
});

/**
 * LSP Logger
 *
 * This logger instance is meant to be used for logging messages from the LSP.
 */
export const lspLogger = window.createOutputChannel(`${displayName} LSP`, {
	log: true,
});
