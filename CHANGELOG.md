# Changelog

## 0.1.0-alpha.2

- Each variant remembers its own canvas position and zoom.
- Long layer names stay on one line in the inspector, with the full name on hover.

## 0.1.0-alpha.1

First experimental npm alpha. Standalone React study workspaces with a local canvas, variant comparison, layers and copyable properties, guides, comments, and file-based reviews. Register studies with `defineStudy` and a `variants` collection. Includes an optional stdio MCP server; the `/present` skill is available separately from [getxuui/skills](https://github.com/getxuui/skills).

This release supports `xuui init`, `xuui dev`, and `xuui mcp` on Node 22.12 or newer. The authoring API and workspace format may change between alpha releases.
