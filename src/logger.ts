import { LogLevel, window } from "vscode";
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

type LogArguments = Record<string, unknown>;

/**
 * Logs a message
 *
 * This function logs a generic message to the extension's logger on the
 * `Biome` output channel. The message will only be logged if the extension's
 * logging level is set to level specified by the `level` parameter.
 */
export const log = (
	message: string,
	level: LogLevel = LogLevel.Info,
	args?: LogArguments,
) => {
	if (args) {
		message = `${message}\n\t${Object.entries(args)
			.map(([key, value]) => `${key}=${value}`)
			.join("\n\t")}`.trim();
	}

	switch (level) {
		case LogLevel.Error:
			return logger.error(message);
		case LogLevel.Warning:
			return logger.warn(message);
		case LogLevel.Info:
			return logger.info(message);
		case LogLevel.Debug:
			return logger.debug(message);
		default:
			return logger.debug(message);
	}
};

/**
 * Clears the logger
 *
 * This function does not actually clear the logger, but rather appends a
 * few newlines to the logger to ensure that the logger so that logs from a
 * previous run are visually separated from the current run. We need to do
 * this because of a bug in VS Code where the output channel is not cleared
 * properly when calling `clear()` on it.
 *
 * @see https://github.com/microsoft/vscode/issues/224516
 */
export const clear = () => {
	logger.append("\n\n\n\n\n");
};

/**
 * Log an informational message
 *
 * This function logs an informational message to the extension's logger
 * on the `Biome` output channel. The message will only be logged if the
 * extension's logging level is set to `Info` or higher.
 *
 * @param message The message to log
 * @param args Optional arguments to show alongside the message
 */
export const info = (message: string, args?: LogArguments) =>
	log(message, LogLevel.Info, args);

/**
 * Log a warning message
 *
 * This function logs a warning message to the extension's logger on the
 * `Biome` output channel. The message will only be logged if the extension's
 * logging level is set to `Warning` or higher.
 *
 * @param message The message to log
 * @param args Optional arguments to show alongside the message
 */
export const warn = (message: string, args?: LogArguments) =>
	log(message, LogLevel.Warning, args);

/**
 * Log an error message
 *
 * This function logs an error message to the extension's logger on the
 * `Biome` output channel. The message will only be logged if the extension's
 * logging level is set to `Error` or higher.
 *
 * @param message The message to log
 * @param args Optional arguments to show alongside the message
 */
export const error = (message: string, args?: LogArguments) =>
	log(message, LogLevel.Error, args);

/**
 * Log a debug message
 *
 * This function logs a debug message to the extension's logger on the
 * `Biome` output channel. The message will only be logged if the extension's
 * logging level is set to `Debug` or higher.
 *
 * @param message The message to log
 * @param args Optional arguments to show alongside the message
 */
export const debug = (message: string, args?: LogArguments) =>
	log(message, LogLevel.Debug, args);
