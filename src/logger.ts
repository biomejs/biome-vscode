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
 * Clears the output channel
 */
export const clear = () => {
	// We use this monstrosity to create a visual break in the output channel
	// because the `clear` method does not actually clear the channel, so we end
	// up seeing logs from previous sessions.
	// Related issue: https://github.com/microsoft/vscode/issues/204946
	for (let i = 0; i < 10; i++) {
		logger.appendLine("");
	}
};

// biome-ignore lint/suspicious/noExplicitAny: unknown ahead of time
export const info = (message: string, ...args: any[]) =>
	logger.info(message, ...args);

// biome-ignore lint/suspicious/noExplicitAny: unknown ahead of time
export const warn = (message: string, ...args: any[]) =>
	logger.warn(message, ...args);

// biome-ignore lint/suspicious/noExplicitAny: unknown ahead of time
export const error = (message: string, ...args: any[]) =>
	logger.error(message, ...args);

// biome-ignore lint/suspicious/noExplicitAny: unknown ahead of time
export const debug = (message: string, ...args: any[]) =>
	logger.debug(message, ...args);
