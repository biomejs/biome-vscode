# Changelog

All notable changes to this project will be documented in this file.

## 2.2.3 - 2024-05-25

### <!-- 1 -->:bug: Bug fixes

- Musl libc detection ([#224](https://github.com/biomejs/biome-vscode/pull/224))

## 2.2.2 - 2024-03-07

### <!-- 1 -->:bug: Bug fixes

- Workspace-relative paths in `biome.lspBin` ([#163](https://github.com/biomejs/biome-vscode/pull/163))

## 2.2.1 - 2024-03-06

### <!-- 0 -->:rocket: New features

- Add Yarn PnP support ([#134](https://github.com/biomejs/biome-vscode/pull/134))
- Search for `biome` in PATH ([#129](https://github.com/biomejs/biome-vscode/pull/129))
- Add `astro`, `vue`, and `svelte` support ([#141](https://github.com/biomejs/biome-vscode/pull/141))
- Publish nightlies as pre-releases ([#145](https://github.com/biomejs/biome-vscode/pull/145))
- Support enabling and disabling the extension from configuration

### <!-- 1 -->:bug: Bug fixes

- Activation failure without a workspace ([#98](https://github.com/biomejs/biome-vscode/pull/98))
- Scan workspace folders until biome is found ([#108](https://github.com/biomejs/biome-vscode/pull/108))
- Ensure biome binary exists at path ([#128](https://github.com/biomejs/biome-vscode/pull/128))
- Rollback `undici` and `vscode-languageclient`updates 

## 2.2.0 (yanked) - 2024-03-05 

### <!-- 0 -->:rocket: New features

- Add Yarn PnP support ([#134](https://github.com/biomejs/biome-vscode/pull/134))
- Search for `biome` in PATH ([#129](https://github.com/biomejs/biome-vscode/pull/129))
- Add `astro`, `vue`, and `svelte` support ([#141](https://github.com/biomejs/biome-vscode/pull/141))
- Publish nightlies as pre-releases ([#145](https://github.com/biomejs/biome-vscode/pull/145))
- Support enabling and disabling the extension from configuration

### <!-- 1 -->:bug: Bug fixes

- Activation failure without a workspace ([#98](https://github.com/biomejs/biome-vscode/pull/98))
- Scan workspace folders until biome is found ([#108](https://github.com/biomejs/biome-vscode/pull/108))
- Ensure biome binary exists at path ([#128](https://github.com/biomejs/biome-vscode/pull/128))
- Rollback `undici` and `vscode-languageclient`updates

## 2.1.2 - 2024-01-24

### Bug Fixes

- Only watch lock files in workspace root ([#91](https://github.com/biomejs/biome-vscode/pull/91))

## 2.1.1 - 2024-01-05

### Bug Fixes

- Filter out unhandled schemes ([#69](https://github.com/biomejs/biome-vscode/pull/69))

## 2.1.0 - 2024-01-04

### Bug Fixes

- Skip updates checks when offline
- EPERM error on windows installation ([#7](https://github.com/biomejs/biome-vscode/pull/7))
- Account for undefined destination
- Nightly versions in selector ([#64](https://github.com/biomejs/biome-vscode/pull/64))
- Handle versions list fetch failures ([#65](https://github.com/biomejs/biome-vscode/pull/65))

### Features

- Stop requiring a configuration file ([#30](https://github.com/biomejs/biome-vscode/pull/30))
- Allow formatting and linting of in-memory files ([#63](https://github.com/biomejs/biome-vscode/pull/63))

## 2.0.0 - 2023-11-25

### Documentation

- Refresh README ([#4](https://github.com/biomejs/biome-vscode/pull/4))
- Add instructions to release versions

### Features

- Implement downloader ([#2](https://github.com/biomejs/biome-vscode/pull/2))
- Drop bundled configuration schema ([#3](https://github.com/biomejs/biome-vscode/pull/3))
- Indicate when using nightly in status bar ([#14](https://github.com/biomejs/biome-vscode/pull/14))
- Handle stable and nightly version installed together ([#13](https://github.com/biomejs/biome-vscode/pull/13))