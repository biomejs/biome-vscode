---
"biome": patch
---

Fall back to the original Biome binary when the copy in the temporary location
cannot be executed, for example because a system policy blocks running
executables from that folder. A warning explains the fallback and offers to
disable `biome.runFromTemporaryLocation` for the workspace folder.
