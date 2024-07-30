import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";
import esbuild from "rollup-plugin-esbuild";

export default defineConfig([
	{
		input: "src/index.ts",
		output: {
			dir: "out",
			format: "cjs",
			sourcemap: true,
		},
		plugins: [
			json(),
			commonjs(),
			nodeResolve(),
			esbuild({
				target: "node16",
				sourceMap: true,
			}),
		],
		external: ["vscode", "node:events"],
	},
	{
		input: "test/suites/multi-root-workspace/index.test.ts",
		output: {
			dir: "out/test/suites/multi-root-workspace",
			format: "cjs",
			sourcemap: true,
		},
		plugins: [
			json(),
			commonjs(),
			nodeResolve(),
			esbuild({
				target: "node16",
				sourceMap: true,
			}),
		],
		external: ["vscode", "node:events"],
	},
]);
