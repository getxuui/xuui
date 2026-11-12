import type { CSSProperties } from 'react';
import { defineStudy } from '../../src/xuui/model';
import type { StudioBindings } from '../../src/xuui/parameters';
import { AfterHoursCard, PaperCard } from '../card-study/Cards';
import { cardControls } from '../card-study/study';
import './demo.css';

const directions = [
  {
    id: 'paper',
    name: 'Paper',
    color: '#e8ecdf',
    accent: '#2e493b',
    surface: '#fffefa',
    dark: false,
  },
  {
    id: 'night',
    name: 'After hours',
    color: '#172521',
    accent: '#d4e8a7',
    surface: '#172521',
    dark: true,
  },
  {
    id: 'clay',
    name: 'Clay',
    color: '#ead7c9',
    accent: '#8e492f',
    surface: '#fff7ef',
    dark: false,
  },
  {
    id: 'blue',
    name: 'Blueprint',
    color: '#dfe8f3',
    accent: '#355b8c',
    surface: '#f4f8fd',
    dark: false,
  },
  {
    id: 'ink',
    name: 'Ink',
    color: '#202834',
    accent: '#b5c8e6',
    surface: '#202834',
    dark: true,
  },
  {
    id: 'rose',
    name: 'Rose',
    color: '#f0dde2',
    accent: '#854659',
    surface: '#fff7f9',
    dark: false,
  },
];
const revisions = [
  {
    name: 'First pass',
    description: 'An initial sketch of the direction.',
    rationale:
      'Establish the palette and hierarchy before refining the details.',
    radius: 4,
    weight: 500,
  },
  {
    name: 'More room',
    description: 'Softer corners and more breathing room.',
    rationale:
      'Give the content a little more space. Softer corners make the invitation feel more relaxed.',
    radius: 12,
    weight: 500,
  },
  {
    name: 'Editorial',
    description: 'A serif headline and a quieter composition.',
    rationale:
      'Try an editorial voice with a serif headline. It adds character at the cost of some compactness.',
    radius: 12,
    weight: 500,
  },
  {
    name: 'Candidate',
    description: 'A stronger headline and a clearer primary action.',
    rationale:
      'Bring the strongest details together into a candidate for review. Keep the primary action easy to find.',
    radius: 18,
    weight: 600,
  },
];

/** Fictional revisions for trying a large canvas; the buttons are live. */
export const canvasCardHistoryStudy = defineStudy({
  id: 'canvas-card-history',
  name: 'Card version playground',
  description: '24 live cards: six directions, four fictional revisions each.',
  variants: directions.flatMap((direction) =>
    revisions.map((revision, index) => {
      const version = index + 1;
      const Card = direction.dark ? AfterHoursCard : PaperCard;
      const controls = cardControls(revision.radius, direction.accent);
      const fontWeight = controls.props?.fontWeight;
      if (fontWeight?.type === 'number') fontWeight.default = revision.weight;
      function DemoCard(bindings: StudioBindings) {
        return (
          <div
            className="canvas-card-demo"
            data-demo-tone={direction.dark ? 'dark' : 'light'}
            data-demo-revision={version}
            style={
              {
                '--demo-surface': direction.surface,
                '--demo-art': direction.color,
                '--demo-accent': direction.accent,
              } as CSSProperties
            }
          >
            <Card {...bindings} />
          </div>
        );
      }
      return {
        id: `demo-${direction.id}-v${version}`,
        name: `${direction.name} · v${version}`,
        description: `${revision.name}. ${revision.description}`,
        rationale: revision.rationale,
        color: direction.color,
        component: DemoCard,
        controls,
        from:
          version > 1
            ? [`demo-${direction.id}-v${version - 1}`]
            : direction.id !== 'paper'
              ? ['demo-paper-v1']
              : undefined,
        labels: version === 4 ? ['Candidate'] : undefined,
        grids:
          direction.id === 'blue' && version === 2
            ? [{ type: 'columns' as const, count: 4, gutter: 12, margin: 24 }]
            : undefined,
      };
    }),
  ),
});
