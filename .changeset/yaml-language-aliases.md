---
"biome": minor
---

Handle files that other extensions assign their own language identifier to,
such as Azure Pipelines and GitHub Actions workflows, as the language Biome
supports. The `ansible`, `azure-pipelines`, `dockercompose` and
`github-actions-workflow` language identifiers are handled as YAML by default,
and the new `biome.languageAliases` setting lets you configure your own.
