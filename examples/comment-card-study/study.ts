import { defineStudy } from '../../src/xuui/model';
import {
  CurrentCards,
  GutterCards,
  HairlineCards,
  OutlineCards,
  StateCards,
} from './CommentCards';

export const commentCardStudy = defineStudy({
  id: 'comment-cards',
  name: 'Comment cards',
  description:
    'How should a comment card’s background and number read in the sidebar? Each variant shows the same draft, awaiting and read comments.',
  variants: [
    {
      id: 'comment-cards-current-v1',
      name: 'Current',
      description: 'Muted cards with the green pin above the text.',
      rationale:
        'The baseline. The filled pin matches the canvas pin exactly, but takes its own row, and every card has the same weight.',
      color: '#e3e6e3',
      component: CurrentCards,
    },
    {
      id: 'comment-cards-hairline-v1',
      name: 'Hairline list',
      description: 'No card fill; comments sit between hairlines.',
      rationale:
        'Drops the surface so the sidebar reads as one list, with the pin in a gutter beside the text. Cards lose their edges as click targets.',
      color: '#e3e6e3',
      component: HairlineCards,
    },
    {
      id: 'comment-cards-outline-v1',
      name: 'Outlined, numbered',
      description: 'Outlined cards with a green #19 instead of the pin.',
      rationale:
        'An outline keeps each card an object without filling the sidebar. A text number is quieter, but no longer looks like the canvas pin.',
      color: '#e3e6e3',
      component: OutlineCards,
    },
    {
      id: 'comment-cards-gutter-v1',
      name: 'Pin in gutter',
      description: 'Muted cards with the pin beside the text.',
      rationale:
        'Keeps today’s surface and pin but moves the pin into a gutter, so a short comment saves a row and the text starts higher.',
      color: '#e3e6e3',
      component: GutterCards,
    },
    {
      id: 'comment-cards-state-v1',
      name: 'Tinted by state',
      description: 'Drafts are tinted green; sent comments recede.',
      rationale:
        'What still needs you stands out: drafts get a brand tint and a filled badge, sent comments a faint surface and an outlined number.',
      color: '#e3e6e3',
      component: StateCards,
    },
  ],
});
