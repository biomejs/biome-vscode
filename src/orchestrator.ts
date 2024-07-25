import { ProgressLocation, type TextEditor, window, workspace } from "vscode";
import type { Project } from "./project";
import { Session } from "./session";
import { state } from "./state";
import { config, logger } from "./utils";

export class Orchestrator {
	/**
	 * Global Biome LSP session
	 *
	 * The global Biome session is used to provide LSP features to files that
	 * do not yet exist on disk, and thus do not belong to any specific Biome
	 * project. This is the case for "untitled" files, which are created when
	 * the user opens a new file that has not yet been saved to disk.
	 */
	private globalSession: Session | undefined;

	/**
	 * The list of Biome projects managed by the orchestrator.
	 *
	 * Whether configured explicitly or detected automatically, each Biome
	 * project is represented by a `Project` instance. This list contains all
	 * the projects that the orchestrator is managing, and each projects gets
	 * its own LSP session and configuration, using possibly a different Biome
	 * version.
	 */
	private projects: Project[] = [];

	/**
	 * Initializes the orchestrator.
	 *
	 * This method initializes the orchestrator, registers listeners for
	 * configuration changes, and starts the orchestrator.
	 *
	 */
	async init() {
		logger.debug("Initializing Biome LSP orchestrator.");

		this.listenForConfigurationChanges();

		if (!this.shouldContinueInitialization()) {
			logger.debug("Orchestrator initialization aborted.");
			return;
		}

		await this.start();

		logger.debug("Biome LSP orchestrator initialized.");
	}

	/**
	 * Starts the orchestrator.
	 *
	 * This method starts the orchestrator and creates a new session for each
	 * Biome root found in each workspace folder.
	 */
	async start() {
		state.state = "starting";

		logger.debug("Setting up global session.");
		this.setupGlobalSession();

		logger.debug("Creating Biome projects.");
		this.projects = await this.projectManager.createProjects();

		if (this.projects.length === 0) {
			state.state = "disabled";
			return;
		}

		// Initialize all projects
		logger.debug("Initializing Biome projects.");
		for (const project of this.projects) {
			await project.init();
		}

		state.state = "started";
	}

	/**
	 * Stops the orchestrator.
	 *
	 * This method stops the orchestrator and destroys all the sessions.
	 */
	async stop() {
		state.state = "stopping";

		// Stop all roots
		for (const root of this.projects) {
			await root.destroy();
		}

		this.projects = [];

		state.state = "stopped";
	}

	/**
	 * Restarts the orchestrator.
	 *
	 * This method restarts the orchestrator, destroying all sessions and then
	 * recreating them.
	 */
	async restart() {
		await this.stop();
		await this.start();
	}

	private async startGlobalSession() {
		if (this.globalSession) return;
		this.globalSession = new Session();
		await this.globalSession.start();
	}

	private async stopGlobalSession() {
		if (!this.globalSession) return;
		await this.globalSession.destroy();
		this.globalSession = undefined;
	}

	/**
	 * Listen for configuration changes
	 *
	 * This method is used to setup a listener for configuration changes. When
	 * the configuration changes, the orchestrator is restarted.
	 */
	private async listenForConfigurationChanges() {
		workspace.onDidChangeConfiguration((event) => {
			if (!event.affectsConfiguration("biome")) {
				return;
			}

			logger.info(
				"Biome configuration changed. Restarting orchestrator...",
			);

			window.withProgress(
				{
					title: "Configuration changed. Restarting Biome extension...",
					cancellable: false,
					location: ProgressLocation.Notification,
				},
				async () => await this.restart(),
			);
		});
		logger.debug("Listening for configuration changes.");
	}

	/**
	 * Determines whether the orchestrator should continue initialization.
	 *
	 * This method is used to determine whether the orchestrator should
	 * continue initialization. Unless the extension is disabled via the
	 * configuration, the orchestrator should continue initialization.
	 */
	private shouldContinueInitialization() {
		return config("enabled", { default: true });
	}

	/**
	 * Sets up the global session
	 *
	 * This method will setup the global session, if necessary. The global
	 * session is used to provide LSP features to files that do not yet exist
	 * on disk, and thus do not belong to any specific Biome project. This is
	 * the case for "untitled" files, which are created when the user opens a
	 * new file that has not yet been saved to disk.
	 *
	 * This global session's lifecycle is automatically managed by the
	 * orchestrator, and is created when the user opens an untitled file, and
	 * destroyed when the user switches to a file that is not untitled.
	 */
	private async setupGlobalSession() {
		const manageLifecycle = async (editor: TextEditor) => {
			if (!editor) return;

			const uri = editor.document.uri;
			if (uri.scheme === "untitled") {
				await this.startGlobalSession();
			} else {
				await this.stopGlobalSession();
			}
		};

		if (window.activeTextEditor?.document.uri.scheme === "untitled") {
			manageLifecycle(window.activeTextEditor);
		}

		window.onDidChangeActiveTextEditor((editor) => manageLifecycle(editor));
	}
}
