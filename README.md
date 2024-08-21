# V3

This branch contains the code for the upcoming v3 of Biome's VS Code extensions.


## Configuration

### `biome.enable`

This configuration option allows you to enable or disable the Biome extension.

### `biome.requireConfig`

This configuration option allows you to enable or disable the requirement of a Biome configuration file
to be present for Biome to be enabled in a given Biome root.

### `biome.roots`

This configuration option allows you to explicitly specify the folders that are considered Biome roots.
Every folder specified in this list will receive an independent instance of Biome, scoped to that folder.
The Biome binary for each root will be determined independently, and in the context of the folder.

> [!WARNING] This setting is only taken into account in the context of a workspace folder, which means that you need to create a `.vscode/settings.json` file in the root of the workspace folder, and add the configuration there.

#### Examples

#### Single project in a workspace folder

```jsonc
{
    "biome.roots": [
        "./",
    ]
}
```

#### Multiple projects in a workspace folder (monorepo)

In this case, `project1` and `project2` are two separate projects in a monorepo and
each have their own Biome dependency and configuration.

```jsonc
{
    "biome.roots": [
        "./packages/project1",
        "./packages/project2",
    ]
}
```