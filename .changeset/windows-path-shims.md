---
"biome": patch
---

Fix global/single-file detection on Windows when Biome is installed via pnpm/npm/Volta shims (`biome.cmd` on PATH). Resolve `.cmd` through the existing unshim path so the LSP starts the real `biome.exe`.
