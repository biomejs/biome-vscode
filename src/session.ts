import { type LogOutputChannel, type Uri, window } from "vscode";
import {
	type DocumentFilter,
	LanguageClient,
	type LanguageClientOptions,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { displayName } from "../package.json";
import { findBiomeGlobally, findBiomeLocally } from "./locator/locator";
import { debug, error, info } from "./logger";
import type { Project } from "./project";
import { mode, subtractURI, supportedLanguages } from "./utils";

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
	const bin = project
		? await findBiomeLocally(project.path)
		: await findBiomeGlobally();

	if (!bin) {
		error("Could not find the Biome binary");
		return;
	}

	info(
		`Found Biome binary at ${bin.uri.fsPath} using strategy ${bin.source}`,
	);

	info("Creating new Biome LSP session");

	return {
		bin: bin.uri,
		project: project,
		client: createLanguageClient(bin.uri, project),
	};
};

/**
 * Creates a new Biome LSP client
 */
const createLanguageClient = (bin: Uri, project?: Project) => {
	info("Creating new Biome LSP client");

	let args = ["lsp-proxy"];
	if (project.configFile) {
		info(`Using custom config file: ${project.configFile.fsPath}`);
		args = [...args, "--config", project.configFile.fsPath];
	}

	const serverOptions: ServerOptions = {
		command: bin.fsPath,
		transport: TransportKind.stdio,
		options: {
			cwd: project.path.fsPath,
		},
		args,
	};

	debug(
		`Starting LSP with command: ${serverOptions.command} ${args.join(" ")}`,
		serverOptions,
	);

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
		...(project && { pattern: `${project.path.fsPath}/**/*` }),
	}));
};
