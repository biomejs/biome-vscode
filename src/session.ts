import { type LogOutputChannel, type Uri, window, workspace } from "vscode";
import {
	type DocumentFilter,
	LanguageClient,
	type LanguageClientOptions,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { displayName } from "../package.json";
import { findBiomeGlobally, findBiomeLocally } from "./binary-finder";
import { debug, error, info } from "./logger";
import { type Project, createProjects } from "./project";
import { state } from "./state";
import {
	hasUntitledDocuments,
	mode,
	shortURI,
	subtractURI,
	supportedLanguages,
} from "./utils";

export type Session = {
	bin: Uri;
	project: Project;
	client: LanguageClient;
};

/**
 * Creates a new Biome LSP session
 */
export const createSession = async (
	project?: Project,
): Promise<Session | undefined> => {
	const findResult = project
		? await findBiomeLocally(project.path)
		: await findBiomeGlobally();

	if (!findResult) {
		error("Could not find the Biome binary");
		return;
	}

	debug("Creating new Biome LSP session");

	return {
		bin: findResult.bin,
		project: project,
		client: createLanguageClient(findResult.bin, project),
	};
};

/**
 * Creates a new global session
 */
export const createGlobalSession = async () => {
	if (hasUntitledDocuments()) {
		state.globalSession = await createSession();
		state.globalSession?.client.start();
		info("Global LSP session created");
	}

	// Listen for untitled files being opened
	workspace.onDidOpenTextDocument(async (document) => {
		// If the workspace has untitled files open and there is no global session
		// create a new global session
		if (hasUntitledDocuments() && !state.globalSession) {
			state.globalSession = await createSession();
			state.globalSession?.client.start();
			info("Global LSP session created");
		}
	});

	workspace.onDidCloseTextDocument(async () => {
		// If the workspace has no untitled files open and there is a global session
		// stop and destroy the global session
		if (!hasUntitledDocuments() && state.globalSession) {
			await state.globalSession.client.stop();
			state.globalSession = undefined;
			info("Global LSP session stopped");
		}
	});
};

/**
 * Creates sessions for all projects
 */
export const createProjectSessions = async () => {
	const projects = await createProjects();
	const sessions = new Map<Project, Session>([]);
	for (const project of projects) {
		const session = await createSession(project);
		if (session) {
			sessions.set(project, session);
			await session.client.start();
			info("Created session for project.", {
				project: shortURI(project),
			});
		} else {
			error("Failed to create session for project.", {
				project: project.path.fsPath,
			});
		}
	}

	state.sessions = sessions;
};

/**
 * Creates a new Biome LSP client
 */
const createLanguageClient = (bin: Uri, project?: Project) => {
	let args = ["lsp-proxy"];
	if (project?.configFile) {
		args = [...args, "--config", project.configFile.fsPath];
	}

	const serverOptions: ServerOptions = {
		command: bin.fsPath,
		transport: TransportKind.stdio,
		options: {
			...(project?.path && { cwd: project.path.fsPath }),
		},
		args,
	};

	const clientOptions: LanguageClientOptions = {
		outputChannel: createLspLogger(project),
		traceOutputChannel: createLspTraceLogger(project),
		documentSelector: createDocumentSelector(project),
	};

	return new LanguageClient(
		"biome.lsp",
		"biome",
		serverOptions,
		clientOptions,
	);
};

/**
 * Creates a new Biome LSP logger
 */
const createLspLogger = (project?: Project): LogOutputChannel => {
	// If the project is missing, we're creating a logger for the global LSP
	// session. In this case, we don't have a workspace folder to display in the
	// logger name, so we just use the display name of the extension.
	if (!project?.folder) {
		return window.createOutputChannel(`${displayName} LSP`, {
			log: true,
		});
	}

	// If the project is present, we're creating a logger for a specific project.
	// In this case, we display the name of the project and the relative path to
	// the project root in the logger name. Additionally, when in a multi-root
	// workspace, we prefix the path with the name of the workspace folder.
	const prefix = mode === "multi-root" ? `${project.folder.name}::` : "";
	const path = subtractURI(project.path, project.folder.uri).fsPath;

	return window.createOutputChannel(`${displayName} LSP (${prefix}${path})`, {
		log: true,
	});
};

/**
 * Creates a new Biome LSP logger
 */
const createLspTraceLogger = (project?: Project): LogOutputChannel => {
	// If the project is missing, we're creating a logger for the global LSP
	// session. In this case, we don't have a workspace folder to display in the
	// logger name, so we just use the display name of the extension.
	if (!project?.folder) {
		return window.createOutputChannel(`${displayName} LSP trace`, {
			log: true,
		});
	}

	// If the project is present, we're creating a logger for a specific project.
	// In this case, we display the name of the project and the relative path to
	// the project root in the logger name. Additionally, when in a multi-root
	// workspace, we prefix the path with the name of the workspace folder.
	const prefix = mode === "multi-root" ? `${project.folder.name}::` : "";
	const path = subtractURI(project.path, project.folder.uri).fsPath;

	return window.createOutputChannel(
		`${displayName} LSP trace (${prefix}${path})`,
		{
			log: true,
		},
	);
};

/**
 * Creates a new document selector
 *
 * This function will create a document selector scoped to the given project,
 * which will only match files within the project's root directory. If no
 * project is specified, the document selector will match files that have
 * not yet been saved to disk (untitled).
 */
const createDocumentSelector = (project?: Project): DocumentFilter[] => {
	return supportedLanguages.map((language) => ({
		language,
		scheme: project ? "file" : "untitled",
		...(project && { pattern: `${project.path.fsPath}**/*` }),
	}));
};
