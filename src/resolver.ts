import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Worker } from "node:worker_threads";

/**
 * Input passed to the resolver worker
 *
 * - `node-modules` resolves the directory of the platform-specific
 *   `@biomejs/cli-*` package using Node's resolution algorithm.
 * - `yarn-pnp` resolves the path to the Biome binary using the Yarn PnP API
 *   exposed by the project's `.pnp.cjs` or `.pnp.js` file.
 */
export type ResolverWorkerInput =
	| {
			kind: "node-modules";
			searchRoot: string;
			platformPackageName: string;
	  }
	| {
			kind: "yarn-pnp";
			pnpFile: string;
			searchRoot: string;
			platformPackageName: string;
			binaryName: string;
	  };

/**
 * Resolves the directory of the platform-specific `@biomejs/cli-*` package
 *
 * Resolution starts from the root `@biomejs/biome` package found from
 * `searchRoot`, and relies on Node's own resolution algorithm so that it
 * behaves the same regardless of the package manager.
 */
export const resolveBiomeCliPackage = (
	searchRoot: string,
	platformPackageName: string,
): string => {
	// Resolve the path to the root @biomejs/biome package starting
	// from the search root.
	const pathToRootBiomePackage = require.resolve(
		"@biomejs/biome/package.json",
		{
			paths: [searchRoot],
		},
	);

	// Create a require function scoped to @biomejs/biome package.
	const rootBiomePackage = createRequire(pathToRootBiomePackage);

	// Resolve the path to the platform-specific @biomejs/cli-* package.
	return dirname(
		rootBiomePackage.resolve(`${platformPackageName}/package.json`),
	);
};

/**
 * Resolves the path to the Biome binary using the Yarn PnP API
 *
 * Throws if the PnP file does not know about `@biomejs/biome`.
 */
export const resolveBiomeInYarnPnp = (
	pnpFile: string,
	searchRoot: string,
	platformPackageName: string,
	binaryName: string,
): string => {
	const yarnPnpApi = require(pnpFile);

	const rootBiomePackage = yarnPnpApi.resolveRequest(
		"@biomejs/biome/package.json",
		searchRoot,
	);

	if (!rootBiomePackage) {
		throw new Error(`@biomejs/biome could not be resolved from ${pnpFile}`);
	}

	return yarnPnpApi.resolveRequest(
		`${platformPackageName}/${binaryName}`,
		rootBiomePackage,
	) as string;
};

/**
 * Resolves the given input in the current thread
 */
export const resolveInCurrentThread = (input: ResolverWorkerInput): string => {
	switch (input.kind) {
		case "node-modules":
			return resolveBiomeCliPackage(
				input.searchRoot,
				input.platformPackageName,
			);
		case "yarn-pnp":
			return resolveBiomeInYarnPnp(
				input.pnpFile,
				input.searchRoot,
				input.platformPackageName,
				input.binaryName,
			);
	}
};

/**
 * Resolves the given input in a worker thread
 *
 * Node caches modules, module resolutions and symlink targets for the lifetime
 * of the process, which means that the extension host keeps resolving to the
 * old Biome version after it was updated, for example by pnpm (symlinks) or
 * Yarn PnP (the `.pnp.cjs` module). A worker thread has its own, empty, module
 * caches, so it always sees the current state of the project. Unlike spawning
 * a new process, it does not trip security software that monitors processes.
 */
export const resolveInWorker = (input: ResolverWorkerInput): Promise<string> =>
	new Promise((resolve, reject) => {
		const worker = new Worker(join(__dirname, "resolve-worker.js"), {
			workerData: input,
		});

		worker.once("message", resolve);
		worker.once("error", reject);
		worker.once("exit", (code) =>
			reject(new Error(`Resolver worker exited with code ${code}`)),
		);
	});
