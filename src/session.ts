import { type LogOutputChannel, type Uri, window } from "vscode";
import {
	LanguageClient,
	type LanguageClientOptions,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { displayName } from "../package.json";
import { findBiomeGlobally, findBiomeLocally } from "./locator/locator";
import type { Project } from "./project.bak";
import { logger, mode, subtractURI, supportedLanguages } from "./utils";

export type Session = {
	bin: Uri;
	project: Project;
	client: LanguageClient;
};

/**
 * Creates a new Biome LSP session
 */
export const createSession = async (project?: Project): Promise<Session> => {
	// Find the Biome binary
	const bin = project
		? (await findBiomeLocally(project.uri)).uri
		: (await findBiomeGlobally()).uri;

	// If the Biome binary could not be found, error out
	if (!bin) {
		logger.error("Could not find the Biome binary");
	}

	return {
		bin: bin,
		project: project,
		client: createLanguageClient(bin, project),
	};
};

/**
 * Creates a new Biome LSP client
 */
const createLanguageClient = (bin: Uri, project?: Project) => {
	const serverOptions: ServerOptions = {
		command: bin.fsPath,
		transport: TransportKind.stdio,
		args: [
			"lsp-proxy",
			// If a custom config file was specified, pass it to Biome
			...(project?.configFile
				? ["--config", project.configFile.fsPath]
				: []),
		],
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
	if (!project?.workspaceFolder) {
		return window.createOutputChannel(`${displayName} LSP`, {
			log: true,
		});
	}

	// If the project is present, we're creating a logger for a specific project.
	// In this case, we display the name of the project and the relative path to
	// the project root in the logger name. Additionally, when in a multi-root
	// workspace, we prefix the path with the name of the workspace folder.
	const prefix =
		mode === "multi-root" ? `${project.workspaceFolder.name}::` : "";
	const path = subtractURI(project.uri, project.workspaceFolder.uri).fsPath;

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
	if (!project?.workspaceFolder) {
		return window.createOutputChannel(`${displayName} LSP trace`, {
			log: true,
		});
	}

	// If the project is present, we're creating a logger for a specific project.
	// In this case, we display the name of the project and the relative path to
	// the project root in the logger name. Additionally, when in a multi-root
	// workspace, we prefix the path with the name of the workspace folder.
	const prefix =
		mode === "multi-root" ? `${project.workspaceFolder.name}::` : "";
	const path = subtractURI(project.uri, project.workspaceFolder.uri).fsPath;

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
const createDocumentSelector = (project?: Project) => {
	return supportedLanguages.map((language) => ({
		language,
		scheme: project ? "file" : "untitled",
		...(project && { pattern: `${project.uri.fsPath}/**/*` }),
	}));
};
