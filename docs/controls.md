# Canvas controls

The left panel contains the study switcher, variant list, and layer tree. Drag the horizontal divider to resize navigation and Layers; collapse Layers with its chevron or by dragging the divider down. Both sidebars can be resized or collapsed. On narrow screens, Layers opens in a drawer.

The canvas toolbar switches between selecting layers, interacting with a design, and commenting. The title above each frame shows a copy-link action on hover or keyboard focus; copied links open that variant directly.

| Shortcut            | Action                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| V / C               | Select layers / comment                                                       |
| ⌘L / Ctrl+L         | Copy a link to the selected layers, or the active variant without a selection |
| L                   | Open Layers and focus the selected layer; return to canvas from the tree      |
| ⌘\\ / Ctrl+\\       | Toggle the right sidebar                                                      |
| D                   | Switch light/dark theme                                                       |
| R                   | Toggle focused-view rulers, retaining guides                                  |
| Home                | Center the active variant                                                     |
| ⌘0 / Ctrl+0         | Reset canvas zoom to 100%                                                     |
| Shift+0             | Zoom to 100%                                                                  |
| Shift+1             | Zoom to fit every variant on the canvas                                       |
| Shift+2             | Zoom to the selected layers                                                   |
| ↑ / ↓               | Previous/next variant outside editable controls                               |
| Tab / Shift+Tab     | Cycle sibling layers on canvas, or variants in the variant list               |
| Enter / Shift+Enter | Select a group's children / its parent                                        |
| Option / Alt        | Measure spacing from the selected layer, or inspect layout spacing            |
| Space + drag        | Pan, temporarily leaving Select or Comment mode                               |
| Escape              | Clear selection, leave the variant list, or cancel the current editor         |

Letter shortcuts leave text inputs alone. Pinch to zoom around the pointer; drag empty canvas, use the middle mouse button, or scroll to pan. Rulers and measurements retain component-pixel values through zooming.

## Layers and properties

Selecting a layer replaces State, Props, and Comments with its inspector. Click a property to copy its value; a selectable fallback appears if clipboard access fails. Clearing selection restores the variant controls and comments.

⌘L / Ctrl+L copies a deep link to the selected layers. Opening the link selects them, reveals them in Layers and fits them to the canvas. These links use the same DOM locators as comments, so they refer to the current component structure. The link button in a frame title always copies the whole variant.

In Layers, arrows move through visible rows and expand or collapse groups. Home/End select the first/last visible layer. Enter selects children and Shift+Enter selects the parent, including when focus is on a frame title. Tab cycles siblings; Escape returns focus to the canvas without clearing selection. The inspector includes the layer's CSS position value alongside its bounds.

## Guides

Drag from a ruler to create a guide. Guides snap to nearby edges and centers. Click one to enter its component-pixel position; Enter confirms, Escape restores the previous position, and an empty value deletes it. Delete also removes a focused guide. Arrow keys move it by 1px, or 10px with Shift. Guides persist per variant in the current browser.

Rulers and guides appear only in the focused view. All preserves the focused-view ruler setting while keeping selection and measurements available.

## Grids

Open View settings, the sliders icon in the canvas toolbar, to change how the canvas looks. The Rulers and guides setting applies to every variant; R also toggles rulers. The pixel grid is available on every variant. Columns and rows appear only when the agent set them up for the active variant; otherwise a note says so. Drag a value or click it to type an exact number. A grid's values fold away while it is off and keep their measurements. Grid settings persist per variant, and Reset grids restores the study's authored settings. Overlays follow the design through pan and zoom in both views, without changing its layout.

## Comments

Click an element in Comment mode, type, then add the comment. Clicking outside dismisses the editor and retains unfinished text for reopening; Cancel discards it. ⌘Enter/Ctrl+Enter saves.

Saved draft comments survive reloads and dev-server restarts at the same browser address. A draft on `127.0.0.1` is separate from one on `localhost`, and changing the port also changes its browser storage. Comments on a temporarily missing variant stay stored and return when the variant does.

Comments collect in a draft until **Submit review**. Numbered pins follow their target through panning and zooming. Browser drafts remain separate per study; submitted records and read receipts live in the workspace. See [Reviews and MCP](mcp.md).

Every saved comment gets a unique workspace number, across studies and variants. Numbers keep increasing and survive deletion and submission. Clicking a comment card reveals its matching pin, bringing the target into view; draft cards also reopen the editor.

Submitted comments stay visible after the agent reads them; their receipt changes from Awaiting agent to Read by agent.
