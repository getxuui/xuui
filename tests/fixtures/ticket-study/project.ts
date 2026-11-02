import { defineProject } from '../../../src/xuui/model';
import { cardControls } from '../card-study/project';
import { BotanicalTicket, NightTicket, MorningTicket } from './TicketCard';

export const ticketStudy = defineProject({
  id: 'sunday-tickets',
  name: 'Sunday tickets',
  description:
    'Explore the same Sunday session as a small keepsake and admission ticket.',
  iterations: [
    {
      id: 'ticket-botanical-v1',
      name: 'Botanical admission — a slower kind of Sunday',
      description: 'A green keepsake with an arched botanical stamp.',
      rationale:
        'Use ticket proportions, a perforated stub, and editorial type to make the event feel like something to keep.',
      parentIds: [],
      informedBy: [],
      color: '#e6eddf',
      component: BotanicalTicket,
      controls: cardControls(12, '#2e493b'),
    },
    {
      id: 'ticket-night-v1',
      name: 'Night pass — small gatherings after hours',
      description: 'A dark admission pass with bright type.',
      rationale:
        'Test the ticket structure with a quieter nighttime palette and a direct sans-serif headline.',
      parentIds: [],
      informedBy: [],
      color: '#1e302b',
      component: NightTicket,
      controls: cardControls(12, '#d7e3b0'),
    },
    {
      id: 'ticket-morning-v1',
      name: 'Quiet morning — a place for noticing',
      description: 'A warm paper ticket with an italic headline.',
      rationale:
        'Give the same information a softer morning character through warm paper and expressive serif type.',
      parentIds: [],
      informedBy: [],
      color: '#fff3e0',
      component: MorningTicket,
      controls: cardControls(4, '#9e5034'),
    },
  ],
});
