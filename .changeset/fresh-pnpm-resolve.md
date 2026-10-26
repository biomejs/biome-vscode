---
"biome": patch
---

Pick up the new Biome version after updating it with pnpm or Yarn PnP, without
having to restart VS Code. The Biome binary is now resolved in a worker thread,
so it is no longer affected by Node's module caches. Previously, a Yarn PnP
project could even fall back to a different Biome binary found in the `PATH`.
