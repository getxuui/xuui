import { defineProject } from 'xuui';
import { StarterCard } from './studies/StarterCard';

export const studies = [
  defineProject({
    id: 'first-study',
    name: 'First study',
    description:
      'Present a design, then use the studio to inspect and review it.',
    iterations: [
      {
        id: 'starter-v1',
        name: 'Starter',
        description: 'An interactive starting point for your first study.',
        rationale: 'Replace this card with the design you want to review.',
        parentIds: [],
        informedBy: [],
        color: '#e8ecdf',
        component: StarterCard,
        controls: {
          props: {
            title: {
              type: 'string',
              label: 'Title',
              default: 'Make room to explore.',
            },
          },
        },
      },
    ],
  }),
];
