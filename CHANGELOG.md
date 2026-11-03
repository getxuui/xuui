# Changelog

## Unreleased

- Clicking a frame's title selects the variant's top layer, in the focused view and in All.
- Copying an inspector value replaces it with a tick in place, so the row no longer shifts. Copy fields have no focus ring, pressed shift or copied border.
- The comment field no longer clips text at its corners, and its Clear button is gone.
- Comment cards lead with their pin number. Clicking a card opens its comment: drafts reopen with the caret after the text, and submitted comments select the element they point at.
- Comment pins move with the canvas in the same frame instead of trailing it.
- Shift+1 zooms to fit every variant, Shift+2 zooms to the selection and Shift+0 zooms to 100%.
- Variants that arrive after your last visit flash once in the variant list and on the canvas.
- Reopening the Layers panel no longer flickers the divider.
- The studio carries xuui's Matcha green, sparingly: the mark, comment pins and new-variant highlights.
- Variants can record their history with optional `from`, `answers` and `labels`. The All view then lays the study out as columns of generations, joined by lines carrying the review comments that led to each variant. Comment pins on the lines keep their size at any zoom and show their text when there's room or on hover.

## 0.1.0-alpha.2

- Each variant remembers its own canvas position and zoom.
- Long layer names stay on one line in the inspector, with the full name on hover.
- The MCP server now tells agents to keep waiting for reviews after handing off a link, so feedback arrives without being asked for.
- `docs/mcp.md` shows how to connect the server in Claude Code and Codex.

## 0.1.0-alpha.1

First experimental npm alpha. Standalone React study workspaces with a local canvas, variant comparison, layers and copyable properties, guides, comments, and file-based reviews. Register studies with `defineStudy` and a `variants` collection. Includes an optional stdio MCP server; the `/present` skill is available separately from [getxuui/skills](https://github.com/getxuui/skills).

This release supports `xuui init`, `xuui dev`, and `xuui mcp` on Node 22.12 or newer. The authoring API and workspace format may change between alpha releases.
