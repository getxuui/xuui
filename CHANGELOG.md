# Changelog

## Unreleased

- Clicking a frame's title selects the variant's top layer. In All, the Open icon beside the title, or double-clicking the title, opens the variant on its own. Frame titles keep their on-screen size at any zoom, and Layers starts with one collapsed row per variant.
- Copying an inspector value replaces it with a tick in place, so the row no longer shifts. Copy fields have no focus ring, pressed shift or copied border.
- The comment field no longer clips text at its corners, and its Clear button is gone.
- Comment cards lead with their pin number. Clicking a card opens its comment: drafts reopen with the caret after the text, and submitted comments select the element they point at.
- Comment pins move with the canvas in the same frame instead of trailing it.
- Shift+1 zooms to fit every variant, Shift+2 zooms to the selection (or the active variant when nothing is selected) and Shift+0 zooms to 100%. They also work while focus is in a sidebar.
- Variants that arrive after your last visit flash once in the variant list and on the canvas.
- Reopening the Layers panel no longer flickers the divider.
- The studio carries xuui's Matcha green, sparingly: the mark, comment pins and new-variant highlights.
- Comment pins are solid green teardrops pointing at the commented spot.
- The current variant in the variant list is tinted green.
- Selection uses the brand green instead of purple: the outline, its handles, the size label and the selected layer.
- The studio's neutrals use a matcha-tinted ramp instead of slate, at the same lightness steps, so contrast is unchanged. Rows in the variant list and layer tree share one set of states, with green hover tints and icons and no weight change.
- Layer rows are spaced like the variant list at every depth.
- The right sidebar toggles with ⌘\\ / Ctrl+\\ instead of ⌘B, which browsers use for the bookmarks bar.
- Variants can record their history with optional `from`, `answers` and `labels`. The All view then lays the study out as columns of generations, joined by wires. Submitted comments stay pinned where they were posted on their artboards, keep their size at any zoom and show their text on hover.

## 0.1.0-alpha.2

- Each variant remembers its own canvas position and zoom.
- Long layer names stay on one line in the inspector, with the full name on hover.
- The MCP server now tells agents to keep waiting for reviews after handing off a link, so feedback arrives without being asked for.
- `docs/mcp.md` shows how to connect the server in Claude Code and Codex.

## 0.1.0-alpha.1

First experimental npm alpha. Standalone React study workspaces with a local canvas, variant comparison, layers and copyable properties, guides, comments, and file-based reviews. Register studies with `defineStudy` and a `variants` collection. Includes an optional stdio MCP server; the `/present` skill is available separately from [getxuui/skills](https://github.com/getxuui/skills).

This release supports `xuui init`, `xuui dev`, and `xuui mcp` on Node 22.12 or newer. The authoring API and workspace format may change between alpha releases.
