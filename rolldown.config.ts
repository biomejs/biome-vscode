import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { defineConfig } from "rolldown";

export default defineConfig({
	input: "src/main.ts",
	tsconfig: "./tsconfig.json",
	platform: "node",
	transform: {
		target: "node16",
	},
	output: {
		dir: "out",
		format: "cjs",
		sourcemap: true,
		cleanDir: true,
	},
	plugins: [copyStaticAssets()],
	external: ["vscode"],
	checks: {
		eval: false,
	},
});

function copyStaticAssets() {
	const assets = [
		{
			source: "node_modules/web-tree-sitter/web-tree-sitter.wasm",
			destination: "out/web-tree-sitter.wasm",
		},
		{
			source: "node_modules/tree-sitter-gritql/tree-sitter-gritql.wasm",
			destination: "out/tree-sitter-gritql.wasm",
		},
	];

	return {
		name: "copy-static-assets",
		async writeBundle() {
			await Promise.all(
				assets.map(async ({ source, destination }) => {
					const outputPath = resolve(destination);
					await mkdir(dirname(outputPath), { recursive: true });
					await copyFile(resolve(source), outputPath);
				}),
			);
		},
	};
}
