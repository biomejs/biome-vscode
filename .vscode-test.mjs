import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
	files: "out/test/suites/**/*.js",
	label: "Multi-root Workspace Tests",
	workspaceFolder: "test/fixtures/multi-root-workspace",
});
