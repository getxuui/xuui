import { defineStudy } from '../../src/xuui/model';
import { PaperCard } from '../card-study/Cards';
import { cardControls } from '../card-study/study';

export const variantProgressStudy = defineStudy({
  id: 'variant-progress',
  name: 'Variant progress',
  description: 'One shared parent with three named directions in progress.',
  variants: [
    {
      id: 'progress-paper-v1',
      name: 'Paper',
      description: 'The shared parent for three directions in progress.',
      rationale:
        'Keep the Paper design as a stable parent while three follow-up directions explore spacing, density, and typography.',
      color: '#e8ecdf',
      component: PaperCard,
      controls: cardControls(8, '#2e493b'),
    },
  ],
});
