import { defineStudy } from '../../src/xuui/model';
import type { Controls } from '../../src/xuui/parameters';
import {
  ArcCorners,
  CurrentCorners,
  StopCorners,
  UprightCorners,
} from './RulerCorners';

// Panning moves the labels through the corners, as panning the canvas does.
const pan: Controls = {
  props: {
    pan: {
      type: 'number',
      label: 'Pan',
      // Starts with a label on each curve.
      default: -34,
      min: -64,
      max: 64,
      step: 1,
      unit: 'px',
    },
  },
};

export const rulerCornerStudy = defineStudy({
  id: 'ruler-corners',
  name: 'Ruler corners',
  description:
    'How should ruler labels behave where the canvas corner curves? Each variant keeps the same ticks, labels and 12px corner.',
  variants: [
    {
      id: 'ruler-corners-current-v1',
      name: 'Current',
      description: 'Labels run straight and fade over the last 20px.',
      rationale:
        'The baseline. Labels slide straight past the curve and fade by distance, so near the corner they float off the canvas edge.',
      color: '#e3e6e3',
      component: CurrentCorners,
      controls: pan,
    },
    {
      id: 'ruler-corners-stop-v1',
      name: 'Stop at the curve',
      description: 'Labels fade out before the edge starts to curve.',
      rationale:
        'The simplest fix: labels only show beside the straight edge, so none sit off the curve. The corner loses a label sooner.',
      color: '#e3e6e3',
      component: StopCorners,
      controls: pan,
    },
    {
      id: 'ruler-corners-arc-v1',
      name: 'Follow the curve',
      description: 'Labels bend around the corner, turning with it, then fade.',
      rationale:
        'Labels keep their distance from the edge around the curve and turn with it, fading out by 45° where the other ruler takes over.',
      color: '#e3e6e3',
      component: ArcCorners,
      controls: pan,
    },
    {
      id: 'ruler-corners-upright-v1',
      name: 'Follow the curve, upright',
      description: 'Labels bend around the corner but stay upright, then fade.',
      rationale:
        'The same path as Follow the curve without turning, so numbers stay easy to read. They drift slightly off the tangent near 45°.',
      color: '#e3e6e3',
      component: UprightCorners,
      from: ['ruler-corners-arc-v1'],
      controls: pan,
    },
  ],
});
