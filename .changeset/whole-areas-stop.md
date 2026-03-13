---
"biome": minor
---

Now the extension exposes the file watcher controls to the user by adding two new settings:

- `biome.lsp.watcher.kind`: Controls how the Biome file watcher should behave.
- `biome.lsp.watcher.pollingInterval`: The polling interval in milliseconds.

These settings are passed to the Biome LSP server when it is started.
