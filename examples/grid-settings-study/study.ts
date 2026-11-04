import { defineStudy } from '../../src/xuui/model';
import {
  CurrentPopover,
  GroupedCard,
  GroupedIndent,
  GroupedJoined,
  JoinedAlignedToolbar,
  JoinedAnimated,
  JoinedBufferZones,
  JoinedCenteredNote,
  JoinedDeclared,
  JoinedDeclaredState,
  JoinedMissingNote,
  JoinedPlain,
  SettingsRows,
  SettingsSliders,
  ViewSettings,
} from './GridSettings';

export const gridSettingsStudy = defineStudy({
  id: 'grid-settings',
  name: 'Grid settings',
  description:
    'How should the toolbar’s grid popover look so it belongs to the studio? Each variant keeps the same grids and values.',
  variants: [
    {
      id: 'grid-settings-current-v1',
      name: 'Current',
      description: 'Today’s popover: default form fields under a grid icon.',
      rationale:
        'The baseline. Stacked labels, 32px inputs and 14px text come from default form styles, so it reads as a different app from the sidebar.',
      color: '#e3e6e3',
      component: CurrentPopover,
    },
    {
      id: 'grid-settings-rows-v1',
      name: 'Settings rows',
      description: 'A settings icon and sidebar rows with typed values.',
      rationale:
        'Reuses the sidebar’s 28px muted rows: label left, value right, 12px text. Values stay typed, so any count or spacing still fits.',
      color: '#e3e6e3',
      component: SettingsRows,
    },
    {
      id: 'grid-settings-sliders-v1',
      name: 'Settings sliders',
      description: 'Sidebar rows with values you scrub, like Props.',
      rationale:
        'Numbers behave exactly like Font weight and Border radius in Props, so one control works everywhere. Sliders cap the range; click the value to type.',
      color: '#e3e6e3',
      component: SettingsSliders,
      from: ['grid-settings-rows-v1'],
      labels: ['Best one'],
    },
    {
      id: 'grid-settings-view-v1',
      name: 'View settings',
      description:
        'A settings icon for the whole canvas view: rulers and grids.',
      rationale:
        'A settings icon promises more than grids, so this gathers view toggles in one place. Rulers join grids; the popover grows taller.',
      color: '#e3e6e3',
      component: ViewSettings,
      from: ['grid-settings-sliders-v1'],
    },
    {
      id: 'grid-settings-indent-v1',
      name: 'Grouped, indented',
      description:
        'Values hang from their toggle on a guide line, like a tree.',
      rationale:
        'A left line and indent tie each value to its toggle without adding surfaces. One Grids toggle heads the group, and switches are green.',
      color: '#e3e6e3',
      component: GroupedIndent,
      from: ['grid-settings-view-v1', 'grid-settings-sliders-v1'],
      answers: [
        '6cdf8c23-64e3-4b68-827c-fad6fa77ab0d',
        'b72453e5-2807-4457-b1cb-1b7d7f28b14d',
        'b44d3e13-c34d-4cd5-8e0e-1c7d05a8015e',
        '492b14cf-b358-48f9-b90d-ffc776051f7a',
        'af5c01c4-2115-4184-b057-416ba9341bac',
      ],
    },
    {
      id: 'grid-settings-card-v1',
      name: 'Grouped, outlined',
      description: 'Each grid and its values sit in one outlined group.',
      rationale:
        'An outline makes each grid one object you switch on or off. It reads clearest, at the cost of a second border inside the popover.',
      color: '#e3e6e3',
      component: GroupedCard,
      from: ['grid-settings-view-v1', 'grid-settings-sliders-v1'],
      answers: [
        '6cdf8c23-64e3-4b68-827c-fad6fa77ab0d',
        'b72453e5-2807-4457-b1cb-1b7d7f28b14d',
        'b44d3e13-c34d-4cd5-8e0e-1c7d05a8015e',
        '492b14cf-b358-48f9-b90d-ffc776051f7a',
        'af5c01c4-2115-4184-b057-416ba9341bac',
      ],
    },
    {
      id: 'grid-settings-joined-v1',
      name: 'Grouped, joined',
      description: 'The toggle and its values join into one block of rows.',
      rationale:
        'Rows touch with hairline gaps, so the toggle reads as the top of its block. It stays compact, but square inner corners differ from Props.',
      color: '#e3e6e3',
      component: GroupedJoined,
      from: ['grid-settings-view-v1', 'grid-settings-sliders-v1'],
      answers: [
        '6cdf8c23-64e3-4b68-827c-fad6fa77ab0d',
        'b72453e5-2807-4457-b1cb-1b7d7f28b14d',
        'b44d3e13-c34d-4cd5-8e0e-1c7d05a8015e',
        '492b14cf-b358-48f9-b90d-ffc776051f7a',
        'af5c01c4-2115-4184-b057-416ba9341bac',
      ],
    },
    {
      id: 'grid-settings-joined-v2',
      name: 'Joined, plain',
      description: 'Joined rows with square inner corners and no headings.',
      rationale:
        'Answers the review: every inner corner is square, so each block has one outline. Headings, the group toggle and shortcut hints are gone.',
      color: '#e3e6e3',
      component: JoinedPlain,
      from: ['grid-settings-joined-v1'],
      answers: [
        '1c06a78c-7ae8-43c8-a91c-4f0eea2aa1bc',
        '3945810c-8113-4ebf-a395-cd2ddfcd9743',
        '0e7213f9-9773-46b6-bae0-fad5e35816c9',
        '83155880-d376-4c70-8f2b-092d27b38380',
      ],
    },
    {
      id: 'grid-settings-joined-v3',
      name: 'Joined, collapsing',
      description:
        'Values fold away when their grid is off, with State toggles.',
      rationale:
        'Answers the review: a grid that is off shows only its toggle, and its values fold away in 200ms. Sidebar State toggles each grid for review.',
      color: '#e3e6e3',
      component: JoinedAnimated,
      from: ['grid-settings-joined-v2'],
      answers: ['276178db-4192-4f9d-96c0-23c7b6de9c8b'],
      controls: {
        state: {
          pixels: { type: 'boolean', label: 'Pixel grid', default: true },
          columns: { type: 'boolean', label: 'Columns', default: true },
          rows: { type: 'boolean', label: 'Rows', default: true },
        },
      },
    },
    {
      id: 'grid-settings-joined-v4',
      name: 'Joined, declared grids',
      description: 'Columns and rows appear only when the agent declared them.',
      rationale:
        'The pixel grid measures any design, so it is always offered. Columns and rows only mean something for a layout the agent set up.',
      color: '#e3e6e3',
      component: JoinedDeclared,
      from: ['grid-settings-joined-v3'],
      controls: {
        props: {
          declared: {
            type: 'select',
            label: 'Declared by agent',
            default: 'columns',
            options: [
              { label: 'No layout grids', value: 'none' },
              { label: 'Columns', value: 'columns' },
              { label: 'Columns and rows', value: 'both' },
            ],
          },
        },
        state: {
          pixels: { type: 'boolean', label: 'Pixel grid', default: true },
          columns: { type: 'boolean', label: 'Columns', default: true },
          rows: { type: 'boolean', label: 'Rows', default: true },
        },
      },
    },
    {
      id: 'grid-settings-joined-v5',
      name: 'Joined, buffer zones',
      description:
        'Adds a switch for the hatched buffer zone around each frame.',
      rationale:
        'Buffer zones help place a design but add noise when judging it. The switch joins Rulers and guides as a second canvas view option.',
      color: '#e3e6e3',
      component: JoinedBufferZones,
      from: ['grid-settings-joined-v4'],
      controls: {
        props: {
          declared: {
            type: 'select',
            label: 'Declared by agent',
            default: 'columns',
            options: [
              { label: 'No layout grids', value: 'none' },
              { label: 'Columns', value: 'columns' },
              { label: 'Columns and rows', value: 'both' },
            ],
          },
        },
        state: {
          bufferZones: {
            type: 'boolean',
            label: 'Buffer zones',
            default: true,
          },
          pixels: { type: 'boolean', label: 'Pixel grid', default: true },
          columns: { type: 'boolean', label: 'Columns', default: true },
          rows: { type: 'boolean', label: 'Rows', default: true },
        },
      },
    },
    {
      id: 'grid-settings-joined-v6',
      name: 'Joined, missing grids note',
      description:
        'A small note says which layout grids the agent didn’t set up.',
      rationale:
        'Answers the review: hidden columns and rows read as missing rather than broken. The note names only the grids left out.',
      color: '#e3e6e3',
      component: JoinedMissingNote,
      from: ['grid-settings-joined-v5'],
      answers: ['37879968-b26c-40f2-a82b-abc81b69fbe2'],
      controls: {
        props: {
          declared: {
            type: 'select',
            label: 'Declared by agent',
            default: 'none',
            options: [
              { label: 'No layout grids', value: 'none' },
              { label: 'Columns', value: 'columns' },
              { label: 'Columns and rows', value: 'both' },
            ],
          },
        },
        state: {
          bufferZones: {
            type: 'boolean',
            label: 'Buffer zones',
            default: true,
          },
          pixels: { type: 'boolean', label: 'Pixel grid', default: true },
          columns: { type: 'boolean', label: 'Columns', default: true },
          rows: { type: 'boolean', label: 'Rows', default: true },
        },
      },
    },
    {
      id: 'grid-settings-joined-v7',
      name: 'Joined, note follows state',
      description:
        'State toggles say what the agent set up; the note follows them.',
      rationale:
        'Answers the review: turn columns or rows on in State and they appear, and the note updates or disappears. Grid on and off stays in the popover.',
      color: '#e3e6e3',
      component: JoinedDeclaredState,
      from: ['grid-settings-joined-v6'],
      answers: ['114d9b17-eec3-4e9e-a757-540df9d5a709'],
      controls: {
        state: {
          declaredColumns: {
            type: 'boolean',
            label: 'Agent set up columns',
            default: false,
          },
          declaredRows: {
            type: 'boolean',
            label: 'Agent set up rows',
            default: false,
          },
          bufferZones: {
            type: 'boolean',
            label: 'Buffer zones',
            default: true,
          },
        },
      },
    },
    {
      id: 'grid-settings-joined-v8',
      name: 'Joined, centred note',
      description: 'The note is centred and starts with “Agent”.',
      rationale:
        'Answers the review: a centred, shorter note reads as a footnote to the popover rather than a label for the grid above it.',
      color: '#e3e6e3',
      component: JoinedCenteredNote,
      from: ['grid-settings-joined-v7'],
      answers: ['a4a74ae4-e073-4f7a-8052-a5cc1f19c9a5'],
      controls: {
        state: {
          declaredColumns: {
            type: 'boolean',
            label: 'Agent set up columns',
            default: false,
          },
          declaredRows: {
            type: 'boolean',
            label: 'Agent set up rows',
            default: false,
          },
          bufferZones: {
            type: 'boolean',
            label: 'Buffer zones',
            default: true,
          },
        },
      },
    },
    {
      id: 'grid-settings-joined-v9',
      name: 'Joined, aligned toolbar',
      description: 'The toolbar separator is centred with the tools beside it.',
      rationale:
        'Answers the review: the separator’s built-in stretch overrode centring, so its fixed 20px height sat 4px high. The studio toolbar gets the same fix.',
      color: '#e3e6e3',
      component: JoinedAlignedToolbar,
      from: ['grid-settings-joined-v8'],
      answers: ['6fe7af03-276e-42ca-8bf1-7bf19cb5b1c8'],
      controls: {
        state: {
          declaredColumns: {
            type: 'boolean',
            label: 'Agent set up columns',
            default: false,
          },
          declaredRows: {
            type: 'boolean',
            label: 'Agent set up rows',
            default: false,
          },
          bufferZones: {
            type: 'boolean',
            label: 'Buffer zones',
            default: true,
          },
        },
      },
    },
  ],
});
