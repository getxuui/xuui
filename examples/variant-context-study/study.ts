import { defineStudy } from '../../src/xuui/model';
import type { ControlMap } from '../../src/xuui/parameters';
import {
  AllViewCaptions,
  LabelPopover,
  LabelPopoverTitled,
  PageListDescriptions,
  SidebarAndCaptions,
  SidebarRationale,
} from './VariantContext';

const rationaleLength: ControlMap = {
  rationale: {
    type: 'select',
    label: 'Rationale',
    default: 'typical',
    options: [
      { label: 'Typical (125 chars)', value: 'typical' },
      { label: 'At the limit (~280 chars)', value: 'limit' },
    ],
  },
};

export const variantContextStudy = defineStudy({
  id: 'variant-context',
  name: 'Variant context',
  description:
    'Where should the studio show why a variant exists? Each variant places the same description and rationale somewhere else.',
  variants: [
    {
      id: 'context-sidebar-v1',
      name: 'Sidebar',
      description:
        'Rationale at the top of Properties, for the focused variant.',
      rationale:
        'Puts the reason where reviewers already look when they focus a variant, and keeps it beside the controls they adjust while judging it.',
      color: '#e3e6e3',
      component: SidebarRationale,
      controls: { props: rationaleLength },
    },
    {
      id: 'context-captions-v1',
      name: 'All-view captions',
      description:
        'Descriptions under each frame when variants sit side by side.',
      rationale:
        'Comparison happens in the All view, so one-line captions turn the frames into a readable list of options. Rationales stay out of the way.',
      color: '#e3e6e3',
      component: AllViewCaptions,
    },
    {
      id: 'context-pages-v1',
      name: 'Page list',
      description: 'Study and variant descriptions in the left panel.',
      rationale:
        'Frames the study question under the picker and lets reviewers scan every option before opening one. Each page row grows to two lines.',
      color: '#e3e6e3',
      component: PageListDescriptions,
    },
    {
      id: 'context-popover-v1',
      name: 'Label popover',
      description: 'Description and rationale behind the frame label.',
      rationale:
        'Takes no room until asked for. The reason sits behind a click, so reviewers who never open it judge the variant without it.',
      color: '#e3e6e3',
      component: LabelPopover,
      controls: {
        props: rationaleLength,
        machine: {
          label: 'Popover',
          initial: 'open',
          states: {
            closed: { label: 'Closed', on: { Open: 'open' } },
            open: { label: 'Open', on: { Close: 'closed' } },
          },
        },
      },
    },
    {
      id: 'context-popover-v2',
      name: 'Label popover, titled',
      description: 'The popover leads with the description as its title.',
      rationale:
        'Answers the request for a more prominent description. It becomes the title, so the rationale reads as the explanation beneath it.',
      color: '#e3e6e3',
      component: LabelPopoverTitled,
      from: ['context-popover-v1'],
      answers: ['ea6901bb-66be-471f-8a5e-8025d1286413'],
      controls: {
        props: rationaleLength,
        machine: {
          label: 'Popover',
          initial: 'open',
          states: {
            closed: { label: 'Closed', on: { Open: 'open' } },
            open: { label: 'Open', on: { Close: 'closed' } },
          },
        },
      },
    },
    {
      id: 'context-combined-v1',
      name: 'Sidebar and captions',
      description:
        'The sidebar rationale, All-view captions and study description.',
      rationale:
        'Combines the sidebar for reading one variant with captions for comparing them, and frames the question under the study picker.',
      color: '#e3e6e3',
      component: SidebarAndCaptions,
      from: ['context-sidebar-v1', 'context-captions-v1'],
      controls: {
        props: rationaleLength,
        state: {
          view: {
            type: 'select',
            label: 'View',
            default: 'focused',
            options: [
              { label: 'Focused', value: 'focused' },
              { label: 'All', value: 'all' },
            ],
          },
        },
      },
    },
  ],
});
