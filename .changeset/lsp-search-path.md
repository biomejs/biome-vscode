---
"biome": minor
---

Added the `biome.lsp.searchPath` setting, which lets you specify a directory in which to look for the `@biomejs/biome` package. This is useful when Biome is installed in a subdirectory of the workspace rather than at its root. Relative paths are resolved against the root of the workspace folder. If Biome cannot be found in this directory, the extension falls back to the root of the workspace folder.

```json
{
  "biome.lsp.searchPath": "./web"
}
```
