# Visual Studio Code extension for Biome

[![](https://img.shields.io/visual-studio-marketplace/v/biomejs.biome?color=374151&label=Visual%20Studio%20Marketplace&labelColor=000&logo=visual-studio-code&logoColor=0098FF)](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
[![](https://img.shields.io/visual-studio-marketplace/v/biomejs.biome?color=374151&label=Open%20VSX%20Registry&labelColor=000&logo=data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2aWV3Qm94PSI0LjYgNSA5Ni4yIDEyMi43IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxwYXRoIGQ9Ik0zMCA0NC4yTDUyLjYgNUg3LjN6TTQuNiA4OC41aDQ1LjNMMjcuMiA0OS40em01MSAwbDIyLjYgMzkuMiAyMi42LTM5LjJ6IiBmaWxsPSIjYzE2MGVmIi8+CiAgPHBhdGggZD0iTTUyLjYgNUwzMCA0NC4yaDQ1LjJ6TTI3LjIgNDkuNGwyMi43IDM5LjEgMjIuNi0zOS4xem01MSAwTDU1LjYgODguNWg0NS4yeiIgZmlsbD0iI2E2MGVlNSIvPgo8L3N2Zz4=&logoColor=0098FF)](https://open-vsx.org/extension/biomejs/biome)

The Visual Studio Code extension for Biome brings first-party support for Biome to VS Code and similar editors such as VSCodium. By integrating with Biome's language server, the extension provides the following features, among others:

- 💾 Format on save
- 💡 Inline suggestions with quick fixes
- 🚧 Refactoring

## Installation

The Visual Studio Code extension for Biome is available from the following sources.

- [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) (recommended for [VS Code](https://code.visualstudio.com/) users)
- [Open VSX Registry](https://open-vsx.org/extension/biomejs/biome) (recommended for [VSCodium](https://vscodium.com/) users)

## Getting Started

This section describes how to get started with the Biome VS Code extension.

### Setting as the default formatter

To set the VS Code extension for Biome as the default formatter, follow the steps below.

1. Open the **Command Palette**: <kbd>⌘/Ctrl</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd>
2. Select _Format Document With…_
3. Select _Configure Default Formatter…_
4. Select **Biome**

This will ensure that VS Code uses Biome to format all supported files, instead of other formatters that you may have installed.

### Setting as the default formatter for specific languages

If you'd rather not set Biome as the default formatter for all languages, you can set it as the default formatter for specific languages only. The following steps describe how to do this.

1. Open the **Command Palette**
2. Select _Preferences: Open User Settings (JSON)_

Set the `editor.defaultFormatter` to `biomejs.biome` for the desired language. For example, to set Biome as the default formatter for JavaScript files, add the following to your editor's options.

```json
"[javascript]": {
	"editor.defaultFormatter": "biomejs.biome"
}
```

### Choosing a `biome` binary

To resolve the location of the `biome` binary, the extension will look into the following places, in order:

1. The project's local dependencies (`node_modules`)
2. The path specified in the `biome.lspBin` configuration option of the extension
3. The extension's `globalStorage` location

If none of these locations has a `biome` binary, the extension will prompt you to download a binary compatible with your operating system and architecture and store it in the `globalStorage`.

> [!NOTE]
> We recommend adding Biome to your project's devDependencies so that both the extension and your NPM scripts use the same version of Biome.
> ```
> npm install -D @biomejs/biome
> ```


## Usage

### Formatting documents

#### On-demand formatting

To format a document on-demand, follow the steps below.

1. Open the **Command Palette**: <kbd>⌘/Ctrl</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd>
2. Select _Format Document_

You can also format a selection of text by following the steps below.

1. Select the text you want to format
2. Open the **Command Palette**: <kbd>⌘/Ctrl</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd>
3. Select _Format Selection_

#### Formatting on save

This supports formatting on save out of the box. You should enable
format on save in your editor's settings and make sure that the Biome extension is [set as the
default formatter](#setting-as-the-default-formatter) for your documents/languages.

#### Autofix on save

This extension supports VS Code's _Code Actions On Save_ setting. To enable autofix on save, add
the following to your editor configuration.

```json
{
  "editor.codeActionsOnSave": {
	"quickfix.biome": "explicit"
  }
}
```

### Sorting imports (experimental)

Biome has an experimental `Organize Imports` feature that allows you to sort imports automatically. This feature can be run manually or automatically on save.

#### On-demand sorting

To sort imports on-demand, follow the steps below.

1. Open the **Command Palette**: <kbd>⌘/Ctrl</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd>
2. Select _Organize Imports_

#### Sorting on save

To automatically sort imports on save, add the following to your editor configuration.

```json
{
  "editor.codeActionsOnSave": {
	"source.organizeImports.biome": "explicit"
  }
}
```

## Extension Settings

### `biome.lspBin`

The `biome.lspBin` option overrides the Biome binary used by the extension.
The workspace folder is used as the base path if the path is relative.

### `biome.rename`

Enables Biome to handle renames in the workspace (experimental).
