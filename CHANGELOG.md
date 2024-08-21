# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2024-08-21
### Details
#### <!-- 0 -->🚀 Features
- Add support for GraphQL by @ematipico in [#252](https://github.com/biomejs/biome-vscode/pull/252)
- Use statically linked builds on Linux by @Zaczero in [#296](https://github.com/biomejs/biome-vscode/pull/296)
- V3 by @nhedger in [#200](https://github.com/biomejs/biome-vscode/pull/200)

#### <!-- 2 -->🚜 Refactor
- Reduce `@ts-expect-error` and more type safe by @unvalley in [#250](https://github.com/biomejs/biome-vscode/pull/250)

### New Contributors
* @Zaczero made their first contribution in [#296](https://github.com/biomejs/biome-vscode/pull/296)
## [2.3.0] - 2024-06-04
### Details
#### <!-- 0 -->🚀 Features
- Enable extension for CSS files by @ematipico in [#222](https://github.com/biomejs/biome-vscode/pull/222)

## [2.2.3] - 2024-05-25
### Details
#### <!-- 1 -->🐛 Bug Fixes
- Musl libc detection by @nhedger in [#224](https://github.com/biomejs/biome-vscode/pull/224)
- Handle ldd outputing to both stdout and stderr by @nhedger

#### <!-- 2 -->🚜 Refactor
- Tsconfig strict true by @unvalley in [#198](https://github.com/biomejs/biome-vscode/pull/198)

## [2.2.2] - 2024-03-07
### Details
#### <!-- 1 -->🐛 Bug Fixes
- Workspace-relative paths in `biome.lspBin` by @nhedger in [#163](https://github.com/biomejs/biome-vscode/pull/163)

## [2.2.0] - 2024-03-05
### Details
#### <!-- 0 -->🚀 Features
- Add Yarn PnP support by @roblillack in [#134](https://github.com/biomejs/biome-vscode/pull/134)
- Search for `biome` in PATH by @nhedger in [#129](https://github.com/biomejs/biome-vscode/pull/129)
- Add `astro`, `vue`, and `svelte` support by @nhedger in [#141](https://github.com/biomejs/biome-vscode/pull/141)
- Publish nightlies as pre-releases by @nhedger in [#145](https://github.com/biomejs/biome-vscode/pull/145)
- Support enabling and disabling the extension from configuration by @nhedger
- Add activation events for `vue`,  `svelte` and `astro` by @nhedger

#### <!-- 1 -->🐛 Bug Fixes
- Only watch lock files in workspace root by @ChiefORZ in [#91](https://github.com/biomejs/biome-vscode/pull/91)
- Activation failure without a workspace by @nhedger in [#98](https://github.com/biomejs/biome-vscode/pull/98)
- Scan workspace folders until biome is found by @nhedger in [#108](https://github.com/biomejs/biome-vscode/pull/108)
- Ensure biome binary exists at path by @nhedger in [#128](https://github.com/biomejs/biome-vscode/pull/128)
- Rollback `undici` and `vscode-languageclient`updates by @nhedger

### New Contributors
* @roblillack made their first contribution in [#134](https://github.com/biomejs/biome-vscode/pull/134)
* @ChiefORZ made their first contribution in [#91](https://github.com/biomejs/biome-vscode/pull/91)
## [2.1.1] - 2024-01-05
### Details
#### <!-- 1 -->🐛 Bug Fixes
- Filter out unhandled schemes by @nhedger in [#69](https://github.com/biomejs/biome-vscode/pull/69)

## [2.1.0] - 2024-01-04
### Details
#### <!-- 0 -->🚀 Features
- Stop requiring a configuration file by @nhedger in [#30](https://github.com/biomejs/biome-vscode/pull/30)
- Allow formatting and linting of in-memory files by @nhedger in [#63](https://github.com/biomejs/biome-vscode/pull/63)

#### <!-- 1 -->🐛 Bug Fixes
- Skip updates checks when offline by @nhedger in [#29](https://github.com/biomejs/biome-vscode/pull/29)
- EPERM error on windows installation by @MakakWasTaken in [#7](https://github.com/biomejs/biome-vscode/pull/7)
- Account for undefined destination by @nhedger
- Nightly versions in selector by @nhedger in [#64](https://github.com/biomejs/biome-vscode/pull/64)
- Handle versions list fetch failures by @nhedger in [#65](https://github.com/biomejs/biome-vscode/pull/65)

### New Contributors
* @MakakWasTaken made their first contribution in [#7](https://github.com/biomejs/biome-vscode/pull/7)
## [2.0.0] - 2023-11-26
### Details
#### <!-- 0 -->🚀 Features
- `noMisleadingInstantiator` by @unvalley
- Add rule by @Conaclos
- Implement downloader by @nhedger in [#2](https://github.com/biomejs/biome-vscode/pull/2)
- Drop bundled configuration schema by @nhedger in [#3](https://github.com/biomejs/biome-vscode/pull/3)
- Indicate when using nightly in status bar by @nhedger in [#14](https://github.com/biomejs/biome-vscode/pull/14)
- Handle stable and nightly version installed together by @nhedger in [#13](https://github.com/biomejs/biome-vscode/pull/13)

#### <!-- 1 -->🐛 Bug Fixes
- Schema and formatter language application by @ematipico
- Correctly apply import sorting on --apply by @ematipico


