> [!IMPORTANT]  
> This repository has been extracted from the [Biome monorepo](https://github.com/biomejs/biome). It is still a work in progress. If you find any issues, please report them in the Biome monorepo.

# Visual Studio Code extension for Biome

[![](https://img.shields.io/visual-studio-marketplace/v/biomejs.biome?color=374151&label=Visual%20Studio%20Marketplace&labelColor=000&logo=visual-studio-code&logoColor=0098FF)](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
[![](https://img.shields.io/visual-studio-marketplace/v/biomejs.biome?color=374151&label=Open%20VSX%20Registry&labelColor=000&logo=data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2aWV3Qm94PSI0LjYgNSA5Ni4yIDEyMi43IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxwYXRoIGQ9Ik0zMCA0NC4yTDUyLjYgNUg3LjN6TTQuNiA4OC41aDQ1LjNMMjcuMiA0OS40em01MSAwbDIyLjYgMzkuMiAyMi42LTM5LjJ6IiBmaWxsPSIjYzE2MGVmIi8+CiAgPHBhdGggZD0iTTUyLjYgNUwzMCA0NC4yaDQ1LjJ6TTI3LjIgNDkuNGwyMi43IDM5LjEgMjIuNi0zOS4xem01MSAwTDU1LjYgODguNWg0NS4yeiIgZmlsbD0iI2E2MGVlNSIvPgo8L3N2Zz4=&logoColor=0098FF)](https://open-vsx.org/extension/biomejs/biome)

The Visual Studio Code extension for Biome brings first-party support for Biome to VS Code and similar editors such as VSCodium. By integrating with Biome's language server, the extension provides the following features, among others:

- 💾 Format on save
- 💡 Inline suggestions with quick fixes
- 🚧 Refactoring

## Installation

The Visual Studio Code extension for Biome is available form the following sources.

- [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) (recommended for [VS Code](https://code.visualstudio.com/) users)
- [Open VSX Registry](https://open-vsx.org/extension/biomejs/biome) (recommended for [VSCodium](https://vscodium.com/) users)

## Getting Started

This section describes how to get started with the Biome VS Code extension.

### Configuration file

By default, the extension will not start unless a `biome.json` file is present at the
root of the workspace. You can disable this behavior by setting the `biome.requireConfiguration`
setting to `false`.

### Setting as the default formatter

To set the VS Code extension for Biome as the default formatter, follow the steps below.

1. Open the **Command Palette**
2. Select _Format Document With…_
3. Select _Configure Default Formatter…_
4. Select **Biome**

This will ensure that VS Code uses Biome to format all supported files, instead of other formatters that you may have installed.

### Setting as the default formatter for specific languages

If you'd rather not set Biome as the default formatter for all languages, you can set it as the default formatter for specific languages only. The following steps describe how to do this.

1. Open the **Command Palette**
2. Select _Preferences: Open User Settings (JSON)_ 

Set the `editor.defaultFormatter` to `biomejs.biome` for the desired language. For example, to set Biome as the default formatter for JavaScript files, add the following to your editor options.

```json
"[javascript]": {
	"editor.defaultFormatter": "biomejs.biome"
}
```

## Biome Resolution

The extension tries to use Biome from your project's local dependencies (`node_modules/Biome`). We recommend adding Biome as a project dependency to ensure that NPM scripts and the extension use the same Biome version.

You can also explicitly specify the `Biome` binary the extension should use by configuring the `biome.lspBin` setting in your editor options.

If the project has no dependency on Biome and no explicit path is configured, the extension uses the Biome version included in its bundle.

## Usage

### Format document

To format an entire document, open the _Command Palette_ (<kbd>Ctrl</kbd>/<kbd title="Cmd">⌘</kbd>+<kbd title="Shift">⇧</kbd>+<kbd>P</kbd>) and select _Format Document_.

To format a text range, select the text you want to format, open the _Command Palette_ (<kbd>Ctrl</kbd>/<kbd title="Cmd">⌘</kbd>+<kbd title="Shift">⇧</kbd>+<kbd>P</kbd>), and select _Format Selection_.

### Format on save

Biome respects VS Code's _Format on Save_ setting. To enable format on save, open the settings (_File_ -> _Preferences_ -> _Settings_), search for `editor.formatOnSave`, and enable the option.

### Fix on save

Biome respects VS Code's _Code Actions On Save_ setting. To enable fix on save, add


```json
{
  "editor.codeActionsOnSave": {
    "quickfix.biome": true
  }
}
```

in vscode `settings.json`.

### Imports Sorting [Experimental]

The Biome VS Code extension supports imports sorting through the "Organize Imports" code action. By default this action can be run using the <kbd title="Shift">⇧</kbd>+<kbd>Alt</kbd>+<kbd>O</kbd> keyboard shortcut, or is accessible through the _Command Palette_ (<kbd>Ctrl</kbd>/<kbd title="Cmd">⌘</kbd>+<kbd title="Shift">⇧</kbd>+<kbd>P</kbd>) by selecting _Organize Imports_.

You can add the following to your editor configuration if you want the action to run automatically on save instead of calling it manually:

```json
{
	"editor.codeActionsOnSave":{
		"source.organizeImports.biome": true
	}
}
```

## Extension Settings

### `biome.lspBin`

The `biome.lspBin` option overrides the Biome binary used by the extension.
The workspace folder is used as the base path if the path is relative.

### `biome.rename`

Enables Biome to handle renames in the workspace (experimental).

### `biome.requireConfiguration`

Disables formatting, linting, and syntax errors for projects without a `biome.json` file.
Enabled by default.