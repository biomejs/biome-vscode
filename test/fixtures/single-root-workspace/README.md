# Single-root workspace fixture

This folder contains an example single-root workspace used as a test fixture for
the Biome extension. The workspace folder is setup as a single project at the root
of the workspace folder.

## Expectations

When the workspace folder is opened in VS Code, the Biome extension should be active
and used the `biome.json` configuration file at the root of the workspace folder.

## Test protocol

1. Open the workspace in VS Code.
2. Open the `index.js` file.
3. Run the `Format Document with...` command, and select the Biome extension.
4. Verify that the document gets formatted with `indentWidth` set to `2`. and `indentStyle` set to `space`.