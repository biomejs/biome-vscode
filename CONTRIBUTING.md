# Contributing

Thank you for your interest in contributing to this project! 

Please review the following guidelines before making your contribution.

> [!IMPORTANT]
> If you plan on making a significant contribution, we recommend that you first create a discussion describing your proposed contribution to the project. This allows the project maintainers to provide early feedback that can help guide your contribution.

## Project setup

1. Fork the repository and clone it to your local machine.
   ```shell
   gh repo fork biomejs/biome-vscode --clone
   ```
2. Install the dependencies.
   ```shell
   bun install
   ```

## Development

The extension can be started in debug mode by pressing <kbd>F5</kbd> in Visual Studio Code. This will start a watcher that automatically rebuilds the extension when you make changes and opens a new VS Code window with only the Biome extensione extension loaded.

## Making changes

1. **Create a branch.** Before making any changes, create a branch to work on.
   ```shell
   git checkout -b my-branch-name
   ```
2. **Make your changes.** Make your changes to the codebase and commit them. The format of your commit messages is not important at this stage because they will be squashed later, but please ensure that your commit messages are descriptive.

3. **Create a pull request.** Once you are done making your changes, push your branch to your fork and create a pull request. Please ensure that the title of your pull request follows the conventional commits specification.

## Maintainers

This section is for maintainers only. It describes the process for releasing a new version of the extension.

### Releasing a stable version

1. Create a new branch for the release.
   ```shell
   git fetch
   git checkout -b release/vX.Y.Z main
   ```
2. Generate the changelog.
   ```shell
   bun run changelog --bump
   ```
3. Bump the version in `package.json` and to match the latest version in the changelog.
4. Commit and push your changes.
5. Create a pull request named `chore(release): prepare vX.Y.Z`.
6. Merge the pull request.
7. Run the [`Publish`](https://github.com/biomejs/biome-vscode/actions/workflows/publish.yaml) workflow manually from the Actions tab in GitHub (uncheck _nightly_).

### Releasing a nightly version

1. Commit your changes to the _main_ branch.
2. Generate the changelog.
   ```shell
   bun run changelog
   ```
3. Commit and push your changes.
4. Run the [`Publish`](https://github.com/biomejs/biome-vscode/actions/workflows/publish.yaml) workflow manually from the Actions tab in GitHub (check _nightly_).
