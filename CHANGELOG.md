# biome

## 3.6.0

### Minor Changes

- [#1003](https://github.com/biomejs/biome-vscode/pull/1003) [`4fa0ab8`](https://github.com/biomejs/biome-vscode/commit/4fa0ab849858a1fa51c9556769c3a22d6193c1fc) Thanks [@nhedger](https://github.com/nhedger)! - Conditionally wait for configuration change notification on stop

  Up until now, we would always wait 1000ms when stopping the Biome LSP server, even if there were no configuration changes. This change makes it so that we only wait for the notification if there are actually configuration changes to be made, which should make stopping the server faster in cases where there are no changes.

- [#986](https://github.com/biomejs/biome-vscode/pull/986) [`1428b59`](https://github.com/biomejs/biome-vscode/commit/1428b598964cbbd86a7569d9810e648783030131) Thanks [@nhedger](https://github.com/nhedger)! - Warn when overlapping workspace roots cause multiple Biome sessions to apply to the same files.

### Patch Changes

- [#995](https://github.com/biomejs/biome-vscode/pull/995) [`c9b2902`](https://github.com/biomejs/biome-vscode/commit/c9b29026a59d416b1a4abf19b671f6da17862de5) Thanks [@nhedger](https://github.com/nhedger)! - Fixed new biome version not being picked up when updating it with pnpm ([#994](https://github.com/biomejs/biome-vscode/issues/994))

## 3.5.0

### Minor Changes

- [#974](https://github.com/biomejs/biome-vscode/pull/974) [`af4f3a0`](https://github.com/biomejs/biome-vscode/commit/af4f3a0c42c2c727f6c084a022c72b2e8bf720e9) Thanks [@astrochemx](https://github.com/astrochemx)! - Now the extension exposes the file watcher controls to the user by adding two new settings:

  - `biome.lsp.watcher.kind`: Controls how the Biome file watcher should behave.
  - `biome.lsp.watcher.pollingInterval`: The polling interval in milliseconds.

  These settings are passed to the Biome LSP server when it is started.

## 3.4.3

### Patch Changes

- [#976](https://github.com/biomejs/biome-vscode/pull/976) [`81c715c`](https://github.com/biomejs/biome-vscode/commit/81c715c9892694d9e8e46d3e6c6a513c3b7ab9e0) Thanks [@nhedger](https://github.com/nhedger)! - Fix musl system detection

## 3.4.2

### Patch Changes

- [#973](https://github.com/biomejs/biome-vscode/pull/973) [`03d8195`](https://github.com/biomejs/biome-vscode/commit/03d8195a6c6b54618b65dd37e81acbfa99b657a4) Thanks [@astrochemx](https://github.com/astrochemx)! - Fix copying of `web-tree-sitter.wasm` into `out`

## 3.4.1

### Patch Changes

- [#960](https://github.com/biomejs/biome-vscode/pull/960) [`d37684a`](https://github.com/biomejs/biome-vscode/commit/d37684a9dcb4facc79cee43e13971aa52833e7a7) Thanks [@nhedger](https://github.com/nhedger)! - Trust biome domain only if not set

## 3.4.0

### Minor Changes

- [`f50051f`](https://github.com/biomejs/biome-vscode/commit/f50051f3cf01c4f24ea0a263eb927544dfba3f61) Thanks [@nhedger](https://github.com/nhedger)! - Automatically trust biomejs.dev domain for JSON schema downloads

## 3.3.1

### Patch Changes

- [`0fc659c`](https://github.com/biomejs/biome-vscode/commit/0fc659c9afc850292e66d36e03a0455e925dc41d) Thanks [@AMDphreak](https://github.com/AMDphreak)! - correctly resolve global modules when npm is missing/unconfigured

- [`4991c09`](https://github.com/biomejs/biome-vscode/commit/4991c09d8d00cf0df4d42c1332acc33177f77a24) Thanks [@wtto00](https://github.com/wtto00)! - Unable to find the global Biome binary on Windows

## 3.3.0

### Minor Changes

- [#750](https://github.com/biomejs/biome-vscode/pull/795) Thanks [@daivinhtran](https://github.com/daivinhtran)! - Add tree-sitter-based token provider for GritQL

## 3.2.0

### Minor Changes

- [#750](https://github.com/biomejs/biome-vscode/pull/750) [`8e41696`](https://github.com/biomejs/biome-vscode/commit/8e4169620591d00eac1447c21749846709a7afc6) Thanks [@nhedger](https://github.com/nhedger)! - Add GritQL language support

## 3.1.2

### Patch Changes

- [#720](https://github.com/biomejs/biome-vscode/pull/720) [`d7da4ad`](https://github.com/biomejs/biome-vscode/commit/d7da4ad4a7ce46e6369d3264ec63da48441f551e) Thanks [@stathis-alexander](https://github.com/stathis-alexander)! - run biome from the project root when determining version

## 3.1.1

### Patch Changes

- [`39bdeab`](https://github.com/biomejs/biome-vscode/commit/39bdeab6dcf0ccf9537a442009d7a6e0b6450ced) Thanks [@nhedger](https://github.com/nhedger)! - Only start global session once

## 3.1.0

### Minor Changes

- [#644](https://github.com/biomejs/biome-vscode/pull/644) [`9b90787`](https://github.com/biomejs/biome-vscode/commit/9b90787accb1fa45113ab0f67b4e559098bd461a) Thanks [@nhedger](https://github.com/nhedger)! - Add support for locating Biome in global node_modules

- [#670](https://github.com/biomejs/biome-vscode/pull/670) [`e4d6bd0`](https://github.com/biomejs/biome-vscode/commit/e4d6bd0aaeaf2cb03245f117f11b4a939d698759) Thanks [@nhedger](https://github.com/nhedger)! - Resolve biome binary shims to real binary

### Patch Changes

- [#683](https://github.com/biomejs/biome-vscode/pull/683) [`f63695c`](https://github.com/biomejs/biome-vscode/commit/f63695c2d9e87d7a17561a912cdc6f2a77728e12) Thanks [@nhedger](https://github.com/nhedger)! - Correctly dispose of watchers to prevent duplicate sessions

- [`73c05eb`](https://github.com/biomejs/biome-vscode/commit/73c05eb3e112468a31577ffd73d5d7c7350f45a1) Thanks [@nhedger](https://github.com/nhedger)! - Fix absolute path handling in biome.lsp.bin

- [#682](https://github.com/biomejs/biome-vscode/pull/682) [`8c694ee`](https://github.com/biomejs/biome-vscode/commit/8c694eec3265b716e16b14d17c3868e57e8f02eb) Thanks [@nhedger](https://github.com/nhedger)! - Ensure only one global LSP session is created

## 3.0.3

### Patch Changes

- [`aec4308`](https://github.com/biomejs/biome-vscode/commit/aec430803b4187a946c6edfcc1efe711f999847d) Thanks [@nhedger](https://github.com/nhedger)! - Improve debug logging

- [`86a5666`](https://github.com/biomejs/biome-vscode/commit/86a5666f6406ad9025c4991d80bc6793438c5b4a) Thanks [@nhedger](https://github.com/nhedger)! - Add more debug logging

## 3.0.2

### Patch Changes

- [#619](https://github.com/biomejs/biome-vscode/pull/619) [`f7abb6c`](https://github.com/biomejs/biome-vscode/commit/f7abb6c33f593a90e1eed7591aab070cbcf68044) Thanks [@nhedger](https://github.com/nhedger)! - Allow using relative paths in biome.lsp.bin

  This fixes a regression introduced in v3 where relative paths could no longer be
  used inside of the biome.lsp.bin setting.

## 3.0.1

### Patch Changes

- [`d02a61d`](https://github.com/biomejs/biome-vscode/commit/d02a61d0ef8d211db3394046e51962a711d153cc) Thanks [@nhedger](https://github.com/nhedger)! - Normalize patterns to use forward slashes

## 3.0.0

### Major Changes

- Release v3
