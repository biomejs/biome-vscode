# Contribution guidelines

Thank you for considering contributing to the Visual Studio Code extension for
Biome! This document outlines somes of the conventions on development workflow,
testing protocol, and other resources to make it easier to get your contribution
accepted.

As is usually customary when contributing to an open-source project, please
create an issue or a discussion if you plan to make substantial changes. This
gives us, the maintainers, a chance to provide early feedback and ensures that
your contribution is in line with the project's goals.

## Project setup

1. Fork the repository and clone it to your local machine. For simplicity, you
can use the [GitHub CLI] to do this in one command.
   ```shell
   gh repo fork @biomejs/biome-vscode --clone
   ```

2. Install the dependencies. We use [PNPM] to manage the dependencies of the 
project. You should install it using corepack to ensure that you have the same
version as the one used in the project.
   ```shell
   # Enable corepack
   corepack enable

   # Install dependencies
   pnpm install
   ```

[GitHub CLI]: https://cli.github.com/
[PNPM]: https://pnpm.io/
