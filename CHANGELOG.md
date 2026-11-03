# Changelog

## Unreleased

Studies now use `defineStudy`, the `Study` and `Variant` types, and a `variants` collection. Parent and feedback ancestry fields have been removed. Reviews use `studyId` and `variantId`; saved reviews and browser drafts from the first alpha remain readable.

## 0.1.0-alpha.1

First experimental npm alpha. Standalone React study workspaces with a local canvas, variant comparison, layers and copyable properties, guides, comments, and file-based reviews. Includes an optional stdio MCP server and the `/present` skill.

This release supports `xuui init`, `xuui dev`, and `xuui mcp`. The authoring API and workspace format may change between alpha releases.
