# Multi-root workspace fixture

This folder contains an example multi-root workspace used as a test fixture for
the Biome extension.

## Expectations
Here are the expectations for this fixture when the workspace is opened in VS Code.

| Workspace Folder   | Project path            | Extension active |
|--------------------|-------------------------|------------------|
| `foo`              | `./packages/frontend`   | ✅               |
| `bar`              | `./packages/backend`    | ✅               |
| `foo`              | `./packages/backend`    | ❌               |
| `bar`              | `./packages/frontend`   | ❌               |

