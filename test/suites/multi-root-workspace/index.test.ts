import { default as assert } from "node:assert";
import { Uri, commands, workspace } from "vscode";
import type { Project } from "../../../src/project";

suite("Multi-root Workspace", () => {
	test("There are two workspace folders", async () => {
		assert.equal(workspace.workspaceFolders?.length, 2);
	});

	test("There are two projects", async () => {
		// Open a file to activate the extension
		await commands.executeCommand(
			"vscode.open",
			Uri.joinPath(workspace.workspaceFolders![0].uri, "trigger.js"),
		);

		const projects =
			await commands.executeCommand<Project[]>("biome.get-projects");
		assert.equal(projects.length, 2);
	});

	test("It creates a project for the the frontend package of the foo workspace", async () => {
		// Open a file to activate the extension
		await commands.executeCommand(
			"vscode.open",
			Uri.joinPath(workspace.workspaceFolders![0].uri, "trigger.js"),
		);

		const projects =
			await commands.executeCommand<Project[]>("biome.get-projects");

		const project = projects.find(
			(project) => project.folder?.name === "foo",
		);

		assert.equal(
			project?.path.fsPath,
			Uri.joinPath(
				workspace.workspaceFolders![0].uri,
				"packages/frontend",
			).fsPath,
		);
	});

	test("It creates a project for the the backend package of the bar workspace", async () => {
		// Open a file to activate the extension
		await commands.executeCommand(
			"vscode.open",
			Uri.joinPath(workspace.workspaceFolders![1].uri, "trigger.js"),
		);

		const projects =
			await commands.executeCommand<Project[]>("biome.get-projects");

		const project = projects.find(
			(project) => project.folder?.name === "bar",
		);

		assert.equal(
			project?.path.fsPath,
			Uri.joinPath(workspace.workspaceFolders![1].uri, "packages/backend")
				.fsPath,
		);
	});

	test("It does not create a project for backend package of the foo workspace", async () => {
		// Open a file to activate the extension
		await commands.executeCommand(
			"vscode.open",
			Uri.joinPath(workspace.workspaceFolders![0].uri, "trigger.js"),
		);

		const projects =
			await commands.executeCommand<Project[]>("biome.get-projects");

		const project = projects.find((project) =>
			project.path.path.includes("foo/packages/backend"),
		);

		assert.equal(project?.path.fsPath, undefined);
	});
});

test("It does not create a project for frontend package of the bar workspace", async () => {
	// Open a file to activate the extension
	await commands.executeCommand(
		"vscode.open",
		Uri.joinPath(workspace.workspaceFolders![1].uri, "trigger.js"),
	);

	const projects =
		await commands.executeCommand<Project[]>("biome.get-projects");

	const project = projects.find((project) =>
		project.path.path.includes("bar/packages/frontend"),
	);

	assert.equal(project?.path.fsPath, undefined);
});
