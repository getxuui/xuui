# Authoring studies

In an installed workspace, register studies in `xuui.studies.ts`. Components and their styles belong in `studies/`, or another workspace directory you choose. The studio remains in the xuui dependency. In the source demo, the registry is `examples/studies.ts`.

```tsx
import { defineStudy } from '@getxuui/xuui';
import { MyCard } from './studies/MyCard';

export const studies = [
  defineStudy({
    id: 'card-study',
    name: 'Card study',
    description: 'How prominent should the main action be?',
    variants: [
      {
        id: 'card-v1',
        name: 'Quiet action',
        description: 'Keep the content ahead of the action.',
        rationale:
          'A quieter button leaves more attention for the card content.',
        color: '#e8ecdf',
        component: MyCard,
      },
    ],
  }),
];
```

A study contains variants. Register it with `defineStudy({ ..., variants: [...] })` and give every variant a stable ID unique across the workspace. Each variant includes a description and a rationale. The description is a one-line subtitle of at most 100 characters. The rationale explains the design choice in one or two sentences: one paragraph of at most 280 characters. Reviewers read both from the ⓘ beside the variant's frame title. Add a new ID and implementation when a new alternative should remain reviewable alongside the existing variants.

Before building a new variant in an existing study, [report its progress](mcp.md#report-a-variant-in-progress) through MCP or `xuui progress`. All displays a loading artboard until that ID appears in the registry. Registry updates apply in place, preserving the reviewer's current variant, camera, controls, selection, and unfinished comment. Keep existing component identities and variant IDs stable when adding registrations. Full reloads also recover the camera, control values, selected layers, canvas mode, and open comment text from browser storage; component-local React state survives in-place registry updates but resets on a full reload.

Supply the providers, styles, data, and dependencies the design needs. Use scoped CSS so a study does not restyle studio controls or another variant. Give the design meaningful dimensions; a percentage width without a sized parent can collapse on the canvas. Add `data-xuui-layer-name` when an element needs a clearer name in Layers.

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

## History

When a variant develops from earlier ones, record where it came from. The All view then lays the study out as its history: generations as columns, with children aligned to their parent's row and branches placed nearby. Wires connect each variant to the ones developed from it. Submitted comments stay pinned where they were posted on their artboards, so each keeps pointing at what it was about; hover a pin to read it.

```tsx
{
  id: 'card-v3',
  name: 'Rounder action',
  description: 'The quiet card with a rounder, softer button.',
  rationale: 'Answers the request for a rounder button.',
  color: '#e8ecdf',
  component: RounderCard,
  from: ['card-v2'],
  answers: ['0b37972e-64c2-4fec-9f70-fc49b6bc1621'],
  labels: ['Shipped'],
}
```

- `from` lists the variants in the same study this one was developed from. A variant can have several.
- `answers` lists the IDs of the submitted review comments it responds to.
- `labels` are up to three short tags shown beside the variant's name, such as "Shipped". They record the reviewer's verdict in their words; xuui gives them no meaning and treats every variant the same.

All three fields are optional; a study without `from` keeps a single row.

## Alignment grids

When aligning a design to a grid, declare it on the variant so the reviewer can see the same alignment. Pixel grids accept any positive CSS-pixel spacing, including 8, 10 and fractional values. Layout grids divide the design into equal columns or rows with a count, gutter and outer margin.

```tsx
grids: [
  { type: 'pixels', size: 8 },
  { type: 'columns', count: 12, gutter: 16, margin: 24 },
  { type: 'rows', count: 6, gutter: 16, margin: 24, visible: false },
],
```

Use at most one of each type. Layout counts are whole numbers from 1 to 1000; gutters and margins are nonnegative CSS-pixel values. `visible` defaults to true. Grids start at the design's top-left corner and follow it through pan and zoom in both focused and All views. They are visual references; they do not change or snap the design's layout.

View settings in the canvas toolbar lets reviewers toggle overlays and adjust their measurements for the active variant. Reviewers can use a pixel grid on any variant, but columns and rows only on variants that declare them, so declare every layout grid the design follows. Overrides persist per variant in the current browser. Reset grids restores the authored configuration.

## Updates

Generated workspaces pin an exact alpha version. Update deliberately with `npm install --save-dev --save-exact @getxuui/xuui@alpha`, then check the changelog and verify the study. Updating the dependency does not rewrite authored components or registrations.

The CLI provides Vite's React and Tailwind processing. For Tailwind utilities in a study, install `tailwindcss` in the workspace and import it in your study stylesheet; ordinary scoped CSS works without additional setup. Root-relative public assets can go in the workspace's `public/` directory.
