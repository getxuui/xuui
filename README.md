# xuui

A local React studio for UI design studies and their variants, using Tailwind CSS and shadcn/ui with Base UI primitives.

## Run

Use Node 24 for local development and checks, including the TypeScript MCP server.

```sh
npm install
npm run dev
```

Open [the Paper variant](http://127.0.0.1:4400/?variant=paper-v1). Choose a variant or **All variants** from the list in the left panel.

The studio has a canvas and a collapsible sidebar on the right, outside the canvas. Resize the sidebar by dragging the canvas’s right edge. On narrow screens the right panel stacks beneath the canvas and the left panel opens in a drawer. The left panel places study navigation above Layers. Its study dropdown switches between named studies and restores their last active variant. Variants appear in a scrollable list beneath the study switcher, with **All** first for the comparison view. Drag the horizontal divider to resize the navigation and Layers sections independently. Drag it fully down or use the Layers chevron to collapse that section. The bottom Layers button or **L** restores it. Arrow keys or **Tab** / **Shift+Tab** switch through the variant list. **Escape** returns focus to the study switcher. Long names scroll within edge masks on hover or keyboard focus, respecting reduced-motion preferences. State and Props use compact filled rows; The copy button sits at the top of the right panel. It copies variant parameters normally and the inspected properties when a layer is selected. Press **⌘B** or **Ctrl+B** to toggle the sidebar. Dark is the default theme. Press **D** to switch themes; the preference survives a reload. The studio uses Slate tones in both themes, with a white light-mode page and a Slate 50 canvas. Letter shortcuts leave text inputs alone.

The hatch stays visible in every canvas mode. It extends 80px around the component, with 20px corners and a separate 1px outline dashed 8px on / 8px off. Its fill uses a 1px stroke at 45° with a 16px clear gap. Four dashed decorative lines extend the variant’s edges through the hatch, beneath the variant. Top and left rulers show minor ticks every 8px and labeled intervals every 64px. Tick marks sit inside the canvas, with labels outside. The component’s top-left corner is **0,0**; positions above and to the left are negative. Press **R** to show or hide rulers; guides stay visible.

Pan with an empty-canvas drag, **Space+drag**, a middle-button drag, or a trackpad/wheel. Pinch on the trackpad or touchscreen to zoom around the gesture position (10–800%). A zoom control above the bottom-center mode toolbar appears while zooming and briefly afterward, showing the current percentage. Click it or press **⌘0** / **Ctrl+0** to reset to 100%. Studio controls use Lucide icons. Rulers, guides, and measurements retain component-pixel values at every zoom. Ruler labels fade at the canvas edges. Press **Home** to center the active variant.

## Guides and measuring

Drag from the top ruler to place a horizontal Y guide, or from the left ruler to place a vertical X guide. Element bounds appear while dragging, and guides snap to nearby edges and centers. Guides can be dragged again. Click a guide to enter its exact position in pixels, including decimals and negative values. The guide moves as you type. **Enter** confirms; submitting a blank value deletes the guide. **Escape** restores the position from before the edit. Drag a guide outside the canvas to remove it, or focus it and press **Delete**. Arrow keys move a focused guide by 1px; holding **Shift** moves it by 10px. Each variant saves its own guides in this browser. Switching variants restores their guides. Guides follow the component when the workspace resizes.

Click a rendered element to select it. Hold **Option** (Alt) and point to or click another element to measure spacing and edge offsets while keeping the first element selected. With nothing selected, hold Option to show relevant layout padding and gaps. Release Option to hide the measurements. **Escape** or a click on empty canvas clears the selection. Selection outlines follow the live element bounds. **Tab** selects the next sibling layer within the current group; **Shift+Tab** selects the previous sibling. Navigation wraps within that group and skips its descendants. With nothing selected, Tab starts at the active variant’s root. **Shift+Enter** selects the parent group; **Enter** selects all immediate children of the selected group, with a separate outline for each child. Text inputs keep normal Tab behavior. Preview text uses the selection cursor.

The **Layers** sidebar shows the rendered component hierarchy. Expand groups with their chevrons or select a row to highlight it on the canvas. Canvas selection also highlights the matching row. Press **L** to open and focus Layers at the selected row. In the tree, **↑/↓** move through visible layers and **→/←** expand or collapse groups and move between parents and children. **Home/End** jump to the first or last visible layer. **Tab/Shift+Tab** cycles through sibling layers within the current group. **Escape** or **L** returns to the canvas while preserving selection. In All variants, each variant has its own root. The sidebar can be resized or collapsed; on narrow screens, the canvas’s Layers button opens it in a drawer.

Selecting a layer replaces State, Props and Comments in the right panel with an inspector grouped into **Position & size**, **Typography** and **Appearance**. Click a property to copy its value, including units. Keyboard activation also copies values; a selectable fallback appears if clipboard access fails. It shows component-pixel bounds, applicable fill/text colors, borders and corner radii, and text properties. Values follow the rendered UI as parameters change. Multiple selected layers show their combined bounds. Clearing the selection, switching variants, or leaving Select mode restores State, Props and Comments.

## Variant URLs

| Variant     | URL                        |
| ----------- | -------------------------- |
| Paper       | `/?variant=paper-v1`       |
| After hours | `/?variant=after-hours-v1` |
| Index       | `/?variant=index-v1`       |
| Soft focus  | `/?variant=soft-focus-v1`  |
| Essential   | `/?variant=essential-v1`   |

The root URL opens the first registered variant. Press **↑** / **↓** for the previous / next variant in the study, including with the sidebar collapsed. In All variants this moves the active variant without leaving the overview. Inputs, menus, sliders, and guides retain their arrow-key behavior. Add `&view=all` for the full study. Legacy `variation`, `preview`, and `iteration` query parameters redirect to `variant`.

The second study, [Sunday tickets](http://127.0.0.1:4400/?study=sunday-tickets&variant=ticket-botanical-v1&view=all), explores the same card as three admission tickets. Study URLs use `study` alongside `variant`; All variants always shows the active study.

[Reading room](http://127.0.0.1:4400/?study=reading-room&variant=reading-cover-v1) adds three interactive book card layouts: Cover, Editorial, and Night edition. Cover also has three heading type variants: Literary · Newsreader, Modern · Geist, and Soft · Fraunces. These retain the layout and change the heading family in response to its submitted review. Try saving a book, reading an excerpt, or adding it to the bag. The sidebar exposes the title, font, font weight, corner radius, color, summary visibility, and bag state.

## Comments and reviews

The toolbar at the bottom of the canvas switches between selecting layers, interacting with the live design, and commenting. Comment mode uses the same speech-bubble marker as its cursor and draft pin; holding Space temporarily switches to the pan cursor. Press **C** for Comment mode, then click a rendered element. **Agentation** identifies the element and captures its metadata; xuui provides the comment editor, variant binding, camera-aware pins, and review submission. Press **V** or **Escape** outside the editor to return to selection. The play button lets you try the design's own interactions.

Click outside the comment editor to dismiss it and keep its unfinished text for the next opening in that variant. Unfinished edits to existing comments also return when reopened. **Cancel** discards the unfinished text; **Add comment** or **Save** commits it to the review draft.

Add comments across variants in a study. Numbered pins stay attached to their target as the canvas pans, zooms, and resizes, and appear only when their variant is visible. The sidebar lets you edit or delete collected comments. Drafts survive reloads in this browser and remain separate for each study. Adding a comment does not submit it.

**Submit review** saves the collected comments as one readable JSON record in `.xuui/reviews/`. Records include stable study/variant identities, target selectors, element text, accessibility information, bounds, viewport, and Agentation annotation metadata. A failed submission preserves the draft for retry. Submitted reviews can be reopened in the sidebar after a restart. **Copy submitted review** includes the exact stored record for pasting into the agent conversation; a selectable text fallback appears if clipboard access fails.

Submitted reviews show **Awaiting agent** until the agent calls `xuui_acknowledge_review` after receiving the full package. They then show **Read by agent** and leave the unread queue. The receipt confirms delivery; it does not claim the design changes are complete. Receipts are separate readable files in `.xuui/reviews/receipts/`, preserving the original review record and copy output. The visible studio refreshes receipts every two seconds and on focus.

The sidebar presents each submitted comment as its own card, with the variant, target, complete message, read receipt, time, and a copy action for its submitted package. **All** / **Unread** filters that history while drafts remain editable. Submitted review files remain intact when an example is removed from the studio.

Agentation's global toolbar and live draft syncing are not mounted. The local API exposes submitted packages at `GET /__xuui/reviews`. The MCP connection below reads those same submitted records.

## Connect Codex through MCP

Run the explicit setup from this repository:

```sh
npm run mcp:setup
```

This registers the local `xuui` stdio server through the Codex CLI, pointing to this project's review files. It preserves unrelated configuration, can be rerun, and refuses to replace an existing `xuui` entry configured differently. Use `--name another-name` for a separate connection, or `--project-dir /absolute/path/to/consumer` to read another project's reviews. To opt out during setup, run `npm run mcp:setup -- --skip`; the studio and copyable feedback work independently.

In the desktop app, open **Settings → MCP servers → xuui** and select **Restart** to load the tools. For the CLI, restart the Codex session. MCP configuration is shared by Codex's desktop app, CLI, and IDE extension; see the [official OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp).

The server exposes three reading tools and an explicit acknowledgement:

| Tool                      | Purpose                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `xuui_list_reviews`       | List submitted review summaries, with optional `studyId` / `variantId` filters and pagination.      |
| `xuui_read_review`        | Retrieve the complete stored package using its `reviewId`.                                          |
| `xuui_acknowledge_review` | Record **Read by agent** and remove the review from the unread queue while retaining history.       |
| `xuui_wait_for_review`    | Wait for the oldest unseen matching submission, returning the package and updated `knownReviewIds`. |

For example, ask Codex: **“Read the submitted xuui reviews for card-exploration.”** For an ongoing review: **“Wait for my next xuui review for card-exploration.”** The server supplies workflow instructions when the agent connects.

Agents should list reviews with `unreadOnly: true`, read the full package, then call `xuui_acknowledge_review`. Acknowledged reviews remain readable and listed in history; repeated acknowledgement retains the first read timestamp. Wait calls skip acknowledged reviews. They also accept `knownReviewIds` to exclude packages already received during a running review. An unread package absent from that list returns immediately, including submissions made while disconnected. Waits default to 45 seconds, support cancellation, and stop after at most 50 seconds. Reads never delete feedback. Filters select complete packages rather than removing comments from them.

The preview does not need to be running for MCP reads. The server reads only completed `.json` records in `.xuui/reviews/`; it never reads the browser's draft storage. MCP supplies reading and waiting tools, so the agent must be active or waiting to receive feedback.

For another MCP host, configure this stdio command using absolute paths and a Node runtime with native TypeScript support:

```sh
node /absolute/path/to/xuui/src/xuui/mcp.ts --project-dir /absolute/path/to/consumer
```

Add `--review-dir relative/or/absolute/path` if the studio uses a custom review directory. `XUUI_REVIEW_DIR` is also respected, matching the local review API. The default directory is resolved from `--project-dir`, independently of the host's working directory. Start stdio servers directly with `node`; npm's lifecycle banners would interfere with the MCP protocol on stdout.

## Authoring

Register studies in `examples/studies.ts`. The existing card and ticket examples each register their React components in their study’s `project.ts`. Each variant has a stable ID, a component, and a short explanation. Add a new ID and implementation when advancing a direction. Use `parentIds` for lineage and `informedBy` for relevant feedback IDs. Keep earlier implementations when they should remain reviewable.

Each variant can expose its own `controls.props`, `controls.state`, and optional finite state machine. The studio renders only the controls the registration declares. For example:

```tsx
controls: {
  props: {
    borderRadius: { type: 'number', label: 'Border radius', default: 8, min: 0, max: 40, unit: 'px' },
  },
  state: {
    favourited: { type: 'boolean', label: 'Favourited?', default: false },
  },
  machine: {
    label: 'Reservation', initial: 'available',
    states: {
      available: { label: 'Available', on: { Reserve: 'reserved' } },
      reserved: { label: 'Reserved', on: { Cancel: 'available' } },
    },
  },
}
```

A registered component receives `{ props, state, machine }` as `StudioBindings`. An adapter can pass these values to an ordinary React design. `machine.value` is the current machine state; `machine.send(event)` follows the declared transition. The sidebar can preview any registered state. Number, boolean, string, select, and color dropdowns with swatches are supported. Copy parameters produces JSON with the study and variant IDs, current props, state values, and machine state.

Studio components live in `src/components/ui`, with shadcn configuration in `components.json`. Global Tailwind styles and theme tokens live in `src/index.css`.

## Checks

```sh
npm run build
npm test
```

Install Chromium for the browser tests if needed with `npx playwright install chromium`. Development, browser tests, and API tests use separate Vite caches.

The local feedback API and project-file storage live in `src/xuui/server.ts`. Submitted records use `.xuui/reviews/`; test records use the ignored `.xuui-test/` directory.

The full project scope remains in `xuui-spec-draft.md`.
