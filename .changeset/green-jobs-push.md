---
"biome": minor
---

Conditionally wait for configuration change notification on stop

Up until now, we would always wait 1000ms when stopping the Biome LSP server, even if there were no configuration changes. This change makes it so that we only wait for the notification if there are actually configuration changes to be made, which should make stopping the server faster in cases where there are no changes.
