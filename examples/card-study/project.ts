import { defineProject } from '../../src/xuui/model';
import type { Controls } from '../../src/xuui/parameters';
import { PaperCard, AfterHoursCard } from './Cards';

export function cardControls(borderRadius: number, color: string): Controls {
  return {
    state: {
      favourited: { type: 'boolean', label: 'Favourited?', default: false },
      loggedIn: { type: 'boolean', label: 'Logged in?', default: false },
    },
    props: {
      fontWeight: {
        type: 'number',
        label: 'Font weight',
        default: 500,
        min: 100,
        max: 900,
        step: 100,
      },
      borderRadius: {
        type: 'number',
        label: 'Border radius',
        default: borderRadius,
        min: 0,
        max: 40,
        step: 1,
        unit: 'px',
      },
      color: {
        type: 'color',
        label: 'Color',
        default: color,
        swatches: [...new Set([color, '#2e493b', '#435a7c', '#6a4e40'])],
      },
    },
    machine: {
      label: 'Reservation',
      initial: 'available',
      states: {
        available: { label: 'Available', on: { Reserve: 'reserved' } },
        reserved: { label: 'Reserved', on: { Cancel: 'available' } },
      },
    },
  };
}

export const project = defineProject({
  id: 'card-exploration',
  name: 'Card exploration',
  description: 'Two ways to make a little room for the everyday.',
  iterations: [
    {
      id: 'paper-v1',
      name: 'Paper',
      description: 'Warm, tactile, and a little slower.',
      rationale:
        'Lead with a quiet botanical study. A generous image and a simple hierarchy make the session feel considered and approachable.',
      parentIds: [],
      informedBy: [],
      color: '#e8ecdf',
      component: PaperCard,
      controls: cardControls(8, '#2e493b'),
    },
    {
      id: 'after-hours-v1',
      name: 'After hours',
      description: 'A bold invitation to switch off.',
      rationale:
        'Try a darker, typographic direction. High contrast and an oversized headline give a quiet activity an unexpected presence.',
      parentIds: [],
      informedBy: [],
      color: '#e3e6e3',
      component: AfterHoursCard,
      controls: cardControls(4, '#d4e8a7'),
    },
  ],
});
