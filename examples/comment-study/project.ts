import { defineProject } from '../../src/xuui/model';
import type { Controls } from '../../src/xuui/parameters';
import { ThreadsExample } from './Threads';

const controls: Controls = {
  state: {
    targets: { type: 'boolean', label: 'Show targets?', default: true },
    longComments: { type: 'boolean', label: 'Long comments?', default: false },
  },
  props: {
    panelWidth: {
      type: 'number',
      label: 'Panel width',
      default: 280,
      min: 240,
      max: 360,
      step: 8,
      unit: 'px',
    },
  },
  machine: {
    label: 'Delivery',
    initial: 'submitted',
    states: {
      submitted: {
        label: 'Awaiting agent',
        on: { Read: 'read', Submit: 'submitted' },
      },
      read: { label: 'Read by agent', on: { Submit: 'submitted' } },
    },
  },
};

export const commentStudy = defineProject({
  id: 'comment-system',
  name: 'Comment system',
  description: 'The approved comment layout, shared with the studio sidebar.',
  iterations: [
    {
      id: 'comments-threads-v1',
      name: 'Threads',
      description: 'Each comment is the main unit.',
      rationale:
        'The approved individual-comment layout now powers the studio sidebar. Keep this annotated example available using the same production card, with variant, target, message, and receipt visible together.',
      component: ThreadsExample,
      controls,
      color: '#f1f5f9',
      parentIds: [],
      informedBy: ['042ab299-fa5c-46d5-b028-0b65cbddf9b8'],
    },
  ],
});
