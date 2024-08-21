# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2024-08-21
### Details
#### <!-- 0 -->🚀 Features
- Add support for GraphQL
- Use statically linked builds on Linux
- V3

#### <!-- 2 -->🚜 Refactor
- Reduce `@ts-expect-error` and more type safe

## [2.3.0] - 2024-06-04
### Details
#### <!-- 0 -->🚀 Features
- Enable extension for CSS files

## [2.2.3] - 2024-05-25
### Details
#### <!-- 1 -->🐛 Bug Fixes
- Musl libc detection
- Handle ldd outputing to both stdout and stderr

#### <!-- 2 -->🚜 Refactor
- Tsconfig strict true

## [2.2.2] - 2024-03-07
### Details
#### <!-- 1 -->🐛 Bug Fixes
- Workspace-relative paths in `biome.lspBin`

## [2.2.0] - 2024-03-05
### Details
#### <!-- 0 -->🚀 Features
- Add Yarn PnP support
- Search for `biome` in PATH
- Add `astro`, `vue`, and `svelte` support
- Publish nightlies as pre-releases
- Support enabling and disabling the extension from configuration
- Add activation events for `vue`,  `svelte` and `astro`

#### <!-- 1 -->🐛 Bug Fixes
- Only watch lock files in workspace root
- Activation failure without a workspace
- Scan workspace folders until biome is found
- Ensure biome binary exists at path
- Rollback `undici` and `vscode-languageclient`updates

## [2.1.1] - 2024-01-05
### Details
#### <!-- 1 -->🐛 Bug Fixes
- Filter out unhandled schemes

## [2.1.0] - 2024-01-04
### Details
#### <!-- 0 -->🚀 Features
- Stop requiring a configuration file
- Allow formatting and linting of in-memory files

#### <!-- 1 -->🐛 Bug Fixes
- Skip updates checks when offline
- EPERM error on windows installation
- Account for undefined destination
- Nightly versions in selector
- Handle versions list fetch failures

## [2.0.0] - 2023-11-26
### Details
#### <!-- 0 -->🚀 Features
- `noMisleadingInstantiator`
- Add rule
- Implement downloader
- Drop bundled configuration schema
- Indicate when using nightly in status bar
- Handle stable and nightly version installed together

#### <!-- 1 -->🐛 Bug Fixes
- Schema and formatter language application
- Correctly apply import sorting on --apply


