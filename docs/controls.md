# Canvas controls

The left panel contains the study switcher, variant list, and layer tree. Drag the horizontal divider to resize navigation and Layers; collapse Layers with its chevron or by dragging the divider down. Both sidebars can be resized or collapsed. On narrow screens, Layers opens in a drawer.

The canvas toolbar switches between selecting layers, interacting with a design, and commenting. Decorative lines and hatching remain visible in every mode. The title above each frame shows a copy-link action on hover or keyboard focus; copied links open that variant directly.

| Shortcut            | Action                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| V / C               | Select layers / comment                                                  |
| ⌘L / Ctrl+L         | Copy the active variant link                                             |
| L                   | Open Layers and focus the selected layer; return to canvas from the tree |
| ⌘B / Ctrl+B         | Toggle the right sidebar                                                 |
| D                   | Switch light/dark theme                                                  |
| R                   | Toggle rulers, retaining guides                                          |
| Home                | Center the active variant                                                |
| ⌘0 / Ctrl+0         | Reset canvas zoom to 100%                                                |
| Shift+0             | Zoom to 100%                                                             |
| Shift+1             | Zoom to fit every variant on the canvas                                  |
| Shift+2             | Zoom to the selected layers                                              |
| ↑ / ↓               | Previous/next variant outside editable controls                          |
| Tab / Shift+Tab     | Cycle sibling layers on canvas, or variants in the variant list          |
| Enter / Shift+Enter | Select a group's children / its parent                                   |
| Option / Alt        | Measure spacing from the selected layer, or inspect layout spacing       |
| Space + drag        | Pan, temporarily leaving Select or Comment mode                          |
| Escape              | Clear selection, leave the variant list, or cancel the current editor    |

Letter shortcuts leave text inputs alone. Pinch to zoom around the pointer; drag empty canvas, use the middle mouse button, or scroll to pan. Rulers and measurements retain component-pixel values through zooming.

## Layers and properties

Selecting a layer replaces State, Props, and Comments with its inspector. Click a property to copy its value; a selectable fallback appears if clipboard access fails. Clearing selection restores the variant controls and comments.

In Layers, arrows move through visible rows and expand or collapse groups. Home/End select the first/last visible layer. Tab cycles siblings; Escape returns focus to the canvas without clearing selection.

## Guides

Drag from a ruler to create a guide. Guides snap to nearby edges and centers. Click one to enter its component-pixel position; Enter confirms, Escape restores the previous position, and an empty value deletes it. Delete also removes a focused guide. Arrow keys move it by 1px, or 10px with Shift. Guides persist per variant in the current browser.

## Comments

Click an element in Comment mode, type, then add the comment. Clicking outside dismisses the editor and retains unfinished text for reopening; Cancel discards it. ⌘Enter/Ctrl+Enter saves.

Comments collect in a draft until **Submit review**. Numbered pins follow their target through panning and zooming. Browser drafts remain separate per study; submitted records and read receipts live in the workspace. See [Reviews and MCP](mcp.md).
