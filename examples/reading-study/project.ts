import { defineProject } from '../../src/xuui/model';
import type { Controls } from '../../src/xuui/parameters';
import { CoverCard, EditorialCard, NightCard } from './BookCard';

function bookControls(
  color: string,
  night = false,
  titleFont = 'Georgia, serif',
): Controls {
  return {
    state: {
      summary: { type: 'boolean', label: 'Show summary?', default: true },
    },
    props: {
      title: { type: 'string', label: 'Title', default: 'The quiet atlas' },
      titleFont: {
        type: 'select',
        label: 'Font',
        default: titleFont,
        options: [
          { label: 'Georgia', value: 'Georgia, serif' },
          { label: 'Newsreader', value: '"Newsreader Variable", serif' },
          { label: 'Geist', value: '"Geist Variable", sans-serif' },
          { label: 'Fraunces', value: '"Fraunces Variable", serif' },
        ],
      },
      fontWeight: {
        type: 'number',
        label: 'Font weight',
        default: 500,
        min: 400,
        max: 700,
        step: 100,
      },
      borderRadius: {
        type: 'number',
        label: 'Border radius',
        default: 12,
        min: 0,
        max: 32,
        step: 1,
        unit: 'px',
      },
      color: {
        type: 'color',
        label: 'Color',
        default: color,
        swatches: night
          ? ['#d5d5ac', '#d4c4b8', '#bacbd4']
          : ['#2e5149', '#805340', '#475874'],
      },
    },
    machine: {
      label: 'Bag',
      initial: 'available',
      states: {
        available: { label: 'Not added', on: { Add: 'added' } },
        added: { label: 'Added', on: { Remove: 'available' } },
      },
    },
  };
}

export const readingStudy = defineProject({
  id: 'reading-room',
  name: 'Reading room',
  description: 'Book cards and heading type studies for a slower reading list.',
  iterations: [
    {
      id: 'reading-cover-v1',
      name: 'Cover',
      description: 'A small bookshop window, led by the cover.',
      rationale:
        'Give the illustrated hardback room to breathe. Keep the author, price and purchase action close together beneath it.',
      parentIds: [],
      informedBy: [],
      color: '#e9ecdf',
      component: CoverCard,
      controls: bookControls('#2e5149'),
    },
    ...[
      {
        id: 'newsreader',
        name: 'Literary · Newsreader',
        family: '"Newsreader Variable", serif',
        description: 'A literary serif with a lighter, more open rhythm.',
        rationale:
          'Try Newsreader on the heading for a quieter editorial voice. Its finer details make the title feel closer to a page of print; the card layout, size and weight remain the same.',
      },
      {
        id: 'geist',
        name: 'Modern · Geist',
        family: '"Geist Variable", sans-serif',
        description: 'A clean sans serif with a more direct tone.',
        rationale:
          'Try Geist on the heading to make the title feel more immediate and contemporary. It loses the literary serif texture while retaining the same card layout, size and weight.',
      },
      {
        id: 'fraunces',
        name: 'Soft · Fraunces',
        family: '"Fraunces Variable", serif',
        description: 'A rounded display serif with more character.',
        rationale:
          'Try Fraunces on the heading for a warmer, more expressive title. Its rounded shapes give the book more personality while the card layout, size and weight stay the same.',
      },
    ].map(({ id, name, family, description, rationale }) => ({
      id: `reading-cover-${id}-v1`,
      name,
      description,
      rationale,
      parentIds: ['reading-cover-v1'],
      informedBy: ['68c3b218-daac-4d61-9494-887b0b3eb2b2'],
      color: '#e9ecdf',
      component: CoverCard,
      controls: bookControls('#2e5149', false, family),
    })),
    {
      id: 'reading-editorial-v1',
      name: 'Editorial',
      description: 'A reading recommendation with a little book in the margin.',
      rationale:
        'Develop Cover into a more compact editorial card. Bring the title and description forward and reduce the cover to a small illustration in the margin.',
      parentIds: ['reading-cover-v1'],
      informedBy: [],
      color: '#f7f0e4',
      component: EditorialCard,
      controls: bookControls('#805340'),
    },
    {
      id: 'reading-night-v1',
      name: 'Night edition',
      description: 'A quiet recommendation for the late hours.',
      rationale:
        'Take Cover in a darker direction. A smaller illustration and a pale book jacket keep the same hierarchy while making the card feel at home in an evening reading list.',
      parentIds: ['reading-cover-v1'],
      informedBy: [],
      color: '#29332f',
      component: NightCard,
      controls: bookControls('#d5d5ac', true),
    },
  ],
});
