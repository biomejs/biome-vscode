import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";
import copy from "rollup-plugin-copy";
import esbuild from "rollup-plugin-esbuild";

export default defineConfig([
	{
		input: "src/main.ts",
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
			copy({
				targets: [
					{ src: "node_modules/web-tree-sitter/tree-sitter.wasm", dest: "out" },
					{
						src: "node_modules/tree-sitter-gritql/tree-sitter-gritql.wasm",
						dest: "out",
					},
				],
			}),
		],
		external: ["vscode", "node:events"],
	},
]);
