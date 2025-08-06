# biome

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
