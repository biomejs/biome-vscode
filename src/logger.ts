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

export const clear = () => {
	logger.append("\n\n\n\n\n");
};

export const info = (message: string, args?: LogArguments) =>
	log(message, LogLevel.Info, args);

export const warn = (message: string, args?: LogArguments) =>
	log(message, LogLevel.Warning, args);

export const error = (message: string, args?: LogArguments) =>
	log(message, LogLevel.Error, args);

export const debug = (message: string, args?: LogArguments) =>
	log(message, LogLevel.Debug, args);
