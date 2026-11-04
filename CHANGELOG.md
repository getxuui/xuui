# Changelog

## 0.1.0-alpha.4

- Draft comments are no longer wiped on reload when a variant is missing from the study or a saved comment fails validation. They stay in storage, and unreadable ones are kept under a separate `:unreadable` key.
- The ⓘ beside a variant's frame title opens its description as a title, with its rationale beneath. Reviewers can now read why each variant exists.
- Variant descriptions are limited to 100 characters, and rationales to a single paragraph of 280 characters. Studies with longer text fail to load until it is shortened; reviews submitted earlier still open.
- Ruler ticks and labels follow the canvas's rounded corners. Ticks point at the corner's centre and the two rulers meet at 45°; label text bends along the curve and fades out as it turns.
- Rulers and guides fade in and out when toggled.
- In Play mode, scrollable areas in a design scroll with the wheel; at their end, the canvas pans.
- The grid popover becomes View settings, behind a sliders icon. It uses the sidebar's rows and sliders, adds switches for rulers and guides and for buffer zones (the hatching around each frame), and folds a grid's values away while it is off. Columns and rows appear only on variants whose agent set them up; a note says when they're missing.
- The canvas toolbar's separator is centred with the tools instead of sitting 4px high.
- The canvas zooms out to 2% instead of 10%, so Shift+1 fits large studies.
- Scrolling over the canvas toolbar, comment pins, rulers and asides inside designs pans the canvas. Only scrollable studio panels, such as the comment editor, keep the wheel.
- In dark mode, the Layers panel and sidebar sit on the page background, as they do in light mode. Only the canvas is inset.
- Enter selects child layers and Shift+Enter selects the parent from Layers and frame-title focus, as well as the canvas.
- The Study dropdown uses the same green background, text and icon colors as active navigation rows.
- Comments have durable workspace-wide numbers across studies and variants. Deletion and submission never reuse or renumber them. Clicking a comment card brings its target and matching pin into view.
- Variants support pixel grids with custom spacing and row/column layout grids with count, gutter and margin controls. Agents can declare alignment grids in the study; reviewers can adjust and persist them per variant.
- The inspector shows the selected layer's CSS position value.
- Rulers and guides are hidden in All, preserving the focused-view setting.
- Scrolling over frame titles and their icons pans the canvas.
- Child variants align with their parent's row in the history diagram; branches take nearby rows.
- Variant names, layer names and ruler labels no longer allow accidental text selection.

## 0.1.0-alpha.3

- ⌘L / Ctrl+L copies a deep link to the selected layers, falling back to the active variant when nothing is selected. Opening a layer link restores and fits the selection. Frame-title actions sit closer together.
- Clicking a frame's title selects the variant's top layer and fits it to the canvas, like Shift+2. In All, the Open icon beside the title, or double-clicking the title, opens the variant on its own. Frame titles keep their on-screen size at any zoom, and Layers starts with one collapsed row per variant.
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
- Selected navigation rows keep their background on hover, and dropdown selection ticks use the brand green.
- Selecting a variant from the canvas, Layers, a comment or a shortcut scrolls its sidebar row into view without moving keyboard focus.
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
