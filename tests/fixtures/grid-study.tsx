import { defineStudy } from '../../src/xuui/model';

function GridCard() {
  return (
    <article
      style={{
        width: 360,
        height: 240,
        padding: 20,
        background: '#f5f6ef',
        color: '#1c332a',
      }}
    >
      <h2>Aligned by design</h2>
      <button type="button">Continue</button>
    </article>
  );
}

export const gridStudy = defineStudy({
  id: 'grid-study',
  name: 'Grid study',
  description: 'Pixel and layout alignment.',
  variants: [
    {
      id: 'grid-authored-v1',
      name: 'Authored grids',
      description: 'Three alignment overlays.',
      rationale: 'Expose the alignment used by the design.',
      color: '#f5f6ef',
      component: GridCard,
      grids: [
        { type: 'pixels', size: 10 },
        { type: 'columns', count: 4, gutter: 10, margin: 20 },
        { type: 'rows', count: 3, gutter: 6, margin: 12 },
      ],
    },
    {
      id: 'grid-plain-v1',
      name: 'Without grids',
      description: 'No authored grids.',
      rationale: 'Start without overlays.',
      color: '#f5f6ef',
      component: GridCard,
    },
  ],
});
