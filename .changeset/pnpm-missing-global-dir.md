---
"biome": patch
---

Fixed Biome binary lookup failing when pnpm v11 or later is installed but has no global packages. The extension now skips the missing pnpm global directory and continues looking for Biome in `PATH`.
