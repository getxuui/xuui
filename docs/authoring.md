# Authoring studies

In an installed workspace, register studies in `xuui.studies.ts`. Components and their styles belong in `studies/`, or another workspace directory you choose. The studio remains in the xuui dependency. In the source demo, the registry is `examples/studies.ts`.

```tsx
import { defineProject } from '@getxuui/xuui';
import { MyCard } from './studies/MyCard';

export const studies = [
  defineProject({
    id: 'card-study',
    name: 'Card study',
    description: 'How prominent should the main action be?',
    iterations: [
      {
        id: 'card-v1',
        name: 'Quiet action',
        description: 'Keep the content ahead of the action.',
        rationale:
          'A quieter button leaves more attention for the card content.',
        parentIds: [],
        informedBy: [],
        color: '#e8ecdf',
        component: MyCard,
      },
    ],
  }),
];
```

The API currently uses `defineProject` for a study and `iterations` for its variants. Give every variant a stable ID unique across the workspace. Add a new ID and implementation when advancing a direction. Use `parentIds` for lineage and `informedBy` for relevant feedback IDs. Keep earlier implementations when they should remain reviewable.

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

## Updates

Generated workspaces pin an exact alpha version. Update deliberately with `npm install --save-dev --save-exact @getxuui/xuui@alpha`, then check the changelog and verify the study. Updating the dependency does not rewrite authored components or registrations.

The CLI provides Vite's React and Tailwind processing. For Tailwind utilities in a study, install `tailwindcss` in the workspace and import it in your study stylesheet; ordinary scoped CSS works without additional setup. Root-relative public assets can go in the workspace's `public/` directory.
