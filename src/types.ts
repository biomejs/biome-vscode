/**
 * Execution Mode
 *
 * This defines the execution modes of the extension.
 *
 * - `single-root`: VS Code is running with a single workspace folder.
 * - `multi-root`: VS Code is running with multiple workspace folders.
 * - `single-file`: VS Code is running in single-file mode, with no workspace folder.
 */
export type ExecutionMode = "single-root" | "multi-root" | "single-file";

/**
 * State of a Biome instance
 *
 * This defines the states of a Biome instance.
 *
 * - `starting`: The Biome instance is starting.
 * - `ready`: The Biome instance is ready.
 * - `error`: The Biome instance has encountered an error.
 * - `disabled`: The Biome instance is disabled.
 */
export type State = "starting" | "ready" | "error" | "disabled";
