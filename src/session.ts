import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync } from "node:fs";
import { type LogOutputChannel, Uri, window, workspace } from "vscode";
import {
	type DocumentFilter,
	type InitializeParams,
	LanguageClient,
	type LanguageClientOptions,
	type ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";
import { displayName } from "../package.json";
import { findBiomeGlobally, findBiomeLocally } from "./binary-finder";
import { debug, error, info, warn } from "./logger";
import { type Project, createProjects } from "./project";
import { state } from "./state";
import {
	binaryName,
	directoryExists,
	fileExists,
	fileIsExecutable,
	mode,
	shortURI,
	subtractURI,
	supportedLanguages,
} from "./utils";

export type Session = {
	bin: Uri;
	tempBin?: Uri;
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

	// Copy the binary to a temporary location, and run it from there
	// so that the original binary can be updated without locking issues.
	// We'll keep track of that temporary location in the session and
	// delete it when the session is stopped.
	const tempBin = await copyBinaryToTemporaryLocation(findResult.bin);

	if (!tempBin) {
		warn("Failed to copy binary to temporary location. Using original.");
	}

	return {
		bin: findResult.bin,
		tempBin: tempBin,
		project: project,
		client: createLanguageClient(tempBin ?? findResult.bin, project),
	};
};

export const destroySession = async (session: Session) => {
	// Stop the LSP session
	session.client.stop();

	// Delete the temporary binary
	if (session.tempBin) {
		try {
			workspace.fs.delete(session.tempBin);
			debug("Deleted temporary binary.", {
				path: session.tempBin.fsPath,
			});
		} catch (error) {
			error("Failed to delete temporary binary.", {
				path: session.tempBin.fsPath,
			});
		}
	}
};

export const clearTemporaryBinaries = async () => {
	const binDirPath = Uri.joinPath(state.context.globalStorageUri, "tmp-bin");
	if (await directoryExists(binDirPath)) {
		workspace.fs.delete(binDirPath, {
			recursive: true,
		});
		debug("Cleared temporary binaries.", {
			path: binDirPath.fsPath,
		});
	}
};

/**
 * Copies the binary to a temporary location if necessary
 *
 * This function will copy the binary to a temporary location if it is not already
 * present in the global storage directory. It will then return the location of
 * the copied binary.
 *
 * This approach allows the user to update the original binary that would otherwise
 * be locked if we ran the binary directly from the original location.
 *
 * Binaries copied in the temp location are uniquely identified by their name and version
 * identifier.
 */
const copyBinaryToTemporaryLocation = async (
	bin: Uri,
): Promise<Uri | undefined> => {
	// Retrieve the the version of the binary
	// We call biome with --version which outputs the version in the format
	// of "Version: 1.0.0"
	const version = spawnSync(bin.fsPath, ["--version"])
		.stdout.toString()
		.split(":")[1]
		.trim();

	const location = Uri.joinPath(
		state.context.globalStorageUri,
		"tmp-bin",
		binaryName(`biome-${version}`),
	);

	try {
		await workspace.fs.createDirectory(
			Uri.joinPath(state.context.globalStorageUri, "tmp-bin"),
		);

		if (!(await fileExists(location))) {
			info("Copying binary to temporary location.", {
				original: bin.fsPath,
				destination: location.fsPath,
			});
			copyFileSync(bin.fsPath, location.fsPath);
			debug("Copied binary to temporary location.", {
				original: bin.fsPath,
				destination: location.fsPath,
			});
		} else {
			debug("Binary already exists in temporary location.", {
				original: bin.fsPath,
				destination: location.fsPath,
			});
		}

		const isExecutableBefore = fileIsExecutable(bin);
		chmodSync(location.fsPath, 0o755);
		const isExecutableAfter = fileIsExecutable(bin);

		debug("Ensure binary is executable", {
			binary: bin.fsPath,
			before: `is executable: ${isExecutableBefore}`,
			after: `is executable: ${isExecutableAfter}`,
		});

		return location;
	} catch (error) {
		return undefined;
	}
};

/**
 * Creates a new global session
 */
export const createGlobalSession = async () => {
	state.globalSession = await createSession();

	if (!state.globalSession) {
		warn("Could not create global session");
		return;
	}

	state.globalSession?.client.start();

	info("Global LSP session created");
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
		initializationOptions: {
			rootUri: project?.path,
			rootPath: project?.path?.fsPath,
		},
		workspaceFolder: undefined,
	};

	return new BiomeLanguageClient(
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
	if (project) {
		return supportedLanguages.map((language) => ({
			language,
			scheme: "file",
			pattern: `${project.path.fsPath}**/*`,
		}));
	}

	return supportedLanguages.flatMap((language) => {
		return ["untitled", "vscode-userdata"].map((scheme) => ({
			language,
			scheme,
		}));
	});
};

class BiomeLanguageClient extends LanguageClient {
	protected fillInitializeParams(params: InitializeParams): void {
		super.fillInitializeParams(params);

		if (params.initializationOptions?.rootUri) {
			params.rootUri = params.initializationOptions?.rootUri.toString();
		}

		if (params.initializationOptions?.rootPath) {
			params.rootPath = params.initializationOptions?.rootPath;
		}
	}
}
