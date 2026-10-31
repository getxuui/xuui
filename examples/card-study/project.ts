import { defineProject } from '../../src/xuui/model';
import type { Controls } from '../../src/xuui/parameters';
import {
  PaperCard,
  AfterHoursCard,
  IndexCard,
  SoftFocusCard,
  EssentialCard,
} from './Cards';

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
  description: 'Five ways to make a little room for the everyday.',
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
    {
      id: 'index-v1',
      name: 'Index',
      description: 'The details, brought into focus.',
      rationale:
        'Borrow the structure of an index card. Rules, a numbered edition, and compact details give recurring sessions a recognizable format.',
      parentIds: [],
      informedBy: [],
      color: '#e5e9ed',
      component: IndexCard,
      controls: cardControls(2, '#435a7c'),
    },
    {
      id: 'soft-focus-v1',
      name: 'Soft focus',
      description: 'A gentle, more expressive direction.',
      rationale:
        'Let the illustration spill into a softer composition. Keep the action clear while making more space for warmth and personality.',
      parentIds: [],
      informedBy: [],
      color: '#efe5e2',
      component: SoftFocusCard,
      controls: cardControls(20, '#6a4e40'),
    },
    {
      id: 'essential-v1',
      name: 'Essential',
      description: 'Only what earns its place.',
      rationale:
        'Remove the illustration and bring the useful information forward. A compact alternative for a list of sessions or a smaller surface.',
      parentIds: [],
      informedBy: [],
      color: '#e8e9df',
      component: EssentialCard,
      controls: cardControls(8, '#2e493b'),
    },
  ],
});
