---
"biome": minor
---

Added support for monorepos that have no Biome configuration file at the root of the workspace folder. The extension now finds the nested root `biome.json`/`biome.jsonc` files (skipping `node_modules` and configs with `"root": false`), starts one Biome session per project, and resolves each project's Biome binary from that project's directory. Sessions are recomputed when configuration files are added or removed.
