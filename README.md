# Biome Extension for VS Code

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/biomejs.biome?label=Visual%20Studio%20Marketplace&labelColor=374151&color=60a5fa)](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
[![Open VSX Registry](https://img.shields.io/visual-studio-marketplace/v/biomejs.biome?label=Open%20VSX%20Registry&logo=data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2aWV3Qm94PSI0LjYgNSA5Ni4yIDEyMi43IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxwYXRoIGQ9Ik0zMCA0NC4yTDUyLjYgNUg3LjN6TTQuNiA4OC41aDQ1LjNMMjcuMiA0OS40em01MSAwbDIyLjYgMzkuMiAyMi42LTM5LjJ6IiBmaWxsPSIjYzE2MGVmIi8+CiAgPHBhdGggZD0iTTUyLjYgNUwzMCA0NC4yaDQ1LjJ6TTI3LjIgNDkuNGwyMi43IDM5LjEgMjIuNi0zOS4xem01MSAwTDU1LjYgODguNWg0NS4yeiIgZmlsbD0iI2E2MGVlNSIvPgo8L3N2Zz4=&labelColor=374151&color=60a5fa)](https://open-vsx.org/extension/biomejs/biome)
[![Discord](https://img.shields.io/discord/1132231889290285117?logo=discord&logoColor=white&label=Discord&labelColor=374151&color=5865F2)](https://discord.gg/BypW39g6Yc)

Biome is a comprehensive toolchain for web projects, designed to unify multiple
front-end development tools into a single application. Its primary goal is to
handle common development tasks like formatting, linting, and testing within one
efficient platform, reducing the complexity and overhead of managing separate
tools.

In addition to its formatter and linter capabilities, Biome also aims to function
as:
- **Bundler**: For packaging code for deployment.
- **Minifier**: For reducing code size.
- **Testing Framework**: For running unit and integration tests.

The intent is to replace tools like Prettier, ESLint, webpack/Rollup/esbuild,
Terser, and Jest with a single, high-performance binary written in Rust. This
"one tool" approach simplifies configuration, improves performance due to
integrated parsing and analysis, and ensures consistency across the entire
development process. Biome is designed to be highly configurable, allowing
developers to manage project structure and code quality rules from a single file.

The **Biome extension for Visual Studio Code** brings first-class support for
Biome in VS Code and VS Code-based editors. By integrating with Biome's
language server, the extension provides the following features:

- 💾 Format on save
- 🚜 Code refactoring
- 💡 Inline suggestions and quick fixes

## Language support

Biome is primarily designed to be the unified toolchain for the web. While
it is heavily focused on the JavaScript/TypeScript ecosystem (including
Node.js, front-end frameworks, etc.), it supports several other web-related
languages:

**Fully Supported:**
- JavaScript
- TypeScript
- JSX (React/Preact syntax)
- TSX
- JSON and JSONC (JSON with Comments)
- CSS
- GraphQL (Parsing, Formatting, and Linting)

**Experimental/Partial Support:**
- HTML
- Vue, Svelte, and Astro files (formatting and linting the embedded JavaScript,
  TypeScript, and CSS)

## Usage

In order to use Biome, you must install it, either on a per project basis
or globally on your machine.

To add Biome to your project, use the package manager specified in your project.
This will ensure it is listed as a dev-dependency in `package.json`. Then
configure Biome. Follow the full instructions on the
[Getting Started](<https://biomejs.dev/guides/getting-started/>) page.

## Availability

The Biome extension for VS Code is available on the **Visual Studio Marketplace**
and the **Open VSX Registry**:

- 📦 [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) (recommended for [*VS Code*](https://code.visualstudio.com/) users)
- 📦 [Open VSX Registry](https://open-vsx.org/extension/biomejs/biome) (recommended for [*VSCodium*](https://vscodium.com/) users)

## Documentation

The documentation for the extension is available on the [official website](https://biomejs.dev/).

- [📖 Documentation](https://biomejs.dev/reference/vscode/)

## Contributing

Contributions are welcome!

Please read the [contribution guidelines](CONTRIBUTING.md) for more information.

## License

This open-source project is dual-licensed under the [MIT License](LICENSE-MIT) and the [Apache License, Version 2.0](LICENSE-APACHE)
