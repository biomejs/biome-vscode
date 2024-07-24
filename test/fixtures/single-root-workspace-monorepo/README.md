# Single-root workspace fixture (monorepo)

This folder contains an example single-root workspace used as a test fixture for
the Biome extension. The workspace folder is setup as a monorepo with two packages
under the `packages` directory. Each of the packages are independant projects with
their own versions of Biome and configuration.

## Expectations
Here are the expectations for this fixture when the workspace is opened in VS Code.

| Project path            | Used configuration file    | Extension active |
|-------------------------|----------------------------|------------------|
| `./packages/frontend`   | None (defaults)            | ✅               |
| `./packages/backend`    | Custom (biome.custom.json) | ✅               |
| `./packages/backend`    |                            | ❌               |
| `./packages/frontend`   |                            | ❌               |

## Test protocol

1. Open the workspace in VS Code.
2. Open the `packages/frontend/index.js` file.
3. Run the `Format Document with...` command, and select the Biome extension.
4. Verify that the document gets formatted with `indentWidth` set to `2`. and `indentStyle` set to `space`.
5. Open the `packages/backend/index.js` file.
6. Run the `Format Document with...` command, and select the Biome extension.
7. Verify that the document gets formatted with `indentWidth` set to `4`. and `indentStyle` set to `tab`.