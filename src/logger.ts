import { type LogOutputChannel, window } from "vscode";

export default class Logger {
	/**
	 * The output channel for logging messages.
	 */
	private outputChannel: LogOutputChannel;

	/**
	 * Creates a new logger for the given Biome instance
	 */
	constructor(private readonly name: string) {
		this.outputChannel = window.createOutputChannel(name, {
			log: true,
		});
	}

	public show(preserveFocus: boolean = false): void {
		this.outputChannel.show(preserveFocus);
	}

	/**
	 * Logs a message to the output channel.
	 *
	 * @param message The message to log.
	 */
	public info(message: string): void {
		this.outputChannel?.info(` ${message}`);
	}

	/**
	 * Logs an error message to the output channel.
	 *
	 * @param message The error message to log.
	 */
	public error(message?: string): void {
		this.outputChannel.error(message ?? "");
	}

	/**
	 * Logs a warning message to the output channel.
	 *
	 * @param message The warning message to log.
	 */
	public warn(message?: string): void {
		this.outputChannel.warn(message ?? "");
	}

	/**
	 * Logs a debug message to the output channel.
	 *
	 * @param message The debug message to log.
	 */
	public debug(message?: string): void {
		this.outputChannel.debug(message ?? "");
	}

	/**
	 * Logs a verbose message to the output channel.
	 *
	 * @param message The verbose message to log.
	 */
	public trace(message?: string): void {
		this.outputChannel.trace(message ?? "");
	}
}
