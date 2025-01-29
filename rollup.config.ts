import commonjs from "@rollup/plugin-commonjs";
import del from "rollup-plugin-delete";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";
import esbuild from "rollup-plugin-esbuild";

const isDev = process.env.NODE_ENV === "development";

export default defineConfig([
	{
		input: "src/index.ts",
		output: {
			dir: "out",
			format: "cjs",
			sourcemap: isDev,
		},
		plugins: [
			del({
				targets: "out/*",
				runOnce: true,
			}),
			json(),
			commonjs(),
			nodeResolve(),
			esbuild({
				target: "node16",
				minify: !isDev,
			}),
		],
		external: ["vscode", "node:events"],
	},
]);
