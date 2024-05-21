import { window } from "vscode";
import { displayName } from "../package.json";

/**
 * Logger
 *
 * This logger instance is meant to be used throughout the extension.
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
