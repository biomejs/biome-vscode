# Contribution guidelines

Thank you for considering contributing to the Biome extension for Visual Studio
Code! This document outlines somes of the conventions on development workflow,
testing protocol, and other resources to make it easier to get your contribution
accepted.

As is usually customary when contributing to an open-source project, please
create an [issue], a [discussion] or reach out on [Discord] if you plan to make
substantial changes. This gives the maintainers a chance to provide early
feedback and ensures that your contribution is in line with the project's goals.

[issue]: https://github.com/biomejs/biome-vscode/issues
[discussion]: https://github.com/biomejs/biome-vscode/discussions
[Discord]: https://discord.gg/BypW39g6Yc

## Project setup

1. **Fork the repository** and clone it to your local machine. For simplicity, you
can use the [GitHub CLI] to do this in one command.

   ```shell
   gh repo fork @biomejs/biome-vscode --clone
   ```

2. **Install the dependencies**. We use [PNPM] to manage the dependencies of the
project. You should install it using corepack to ensure that you have the same
version as the one used in the project.

   ```shell
   # Enable corepack
   corepack enable

   # Install dependencies
   pnpm install
   ```

## Testing

This repository ships with launch configurations for debugging the extension,
as well as example projects that can be used to test the extension.

### Debugging

To start debugging the extension, use the `Debug: Select and Start Debugging`
command in the [command palette], or press <kbd>F5</kbd>. This will launch the
extension in debug mode, and allow you to set breakpoints and step through the
code.

[command palette]: https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette

### Example projects

You'll find example projects in the `test/fixtures` directory. These projects
are used to test the extension and can be used to reproduce issues or to test
new features.

## Proposing a change

When you've made sure that your changes are working as expected, you can open a
pull request against the `main` branch.

- Create a new branch from the `main` branch.

  ```shell
  git checkout -b <branch-name>
  ```

- Make your changes in the new branch.
- Create a pull request against the `main` branch.
- Fill the pull request template

> [!WARNING]
> Make sure the title of your pull request follows the [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/) format.
> The messages of individual commits don't matter, because they will be squashed into a single commit message when the pull request is merged.

## Release process

> [!NOTE]
> This section is only relevant for maintainers of the extension.

The release process is mostly automated. The only manual step is to trigger
the release workflows.

We usually release a prerelease version of the extension before promoting the
changes to a stable version, unless there are critical security or performance
issues that need to be addressed.

### 🌙 Releasing a prerelease version

To release a prerelease version of the extension, trigger the [**🌙 Release new prerelease version**](https://github.com/biomejs/biome-vscode/actions/workflows/release-prerelease.yaml) workflow manually.

This workflow:

- Patches the `package.json` version with a date-based prerelease identifier (e.g. `2024.08.221005`).
- Builds and packages the extension.
- Publishes the extension to the Visual Studio Marketplace and Open VSX Registry.

[GitHub CLI]: https://cli.github.com/
[PNPM]: https://pnpm.io/

### 🚀 Releasing a stable version

To release a stable version of the extension, trigger the [**🚀 Release new stable version**](https://github.com/biomejs/biome-vscode/actions/workflows/release-stable.yaml) workflow manually.

This workflow:

- Computes the next version number based on the commit history.
- Generates a changelog based on the commit history.
- Tags the repository with the new version number.
- Patches the `package.json` version with the new version number.
- Builds and packages the extension.
- Publishes the extension to the Visual Studio Marketplace and Open VSX Registry.
- Publishes the extension to GitHub Releases (with release notes).
