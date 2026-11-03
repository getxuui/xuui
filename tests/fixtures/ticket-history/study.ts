import { defineStudy } from '../../../src/xuui/model';
import { ticketComments } from './review';
import {
  BotanicalTicket,
  MorningTicket,
  NightTicket,
} from '../ticket-study/TicketCard';

export const ticketHistoryStudy = defineStudy({
  id: 'ticket-history',
  name: 'Ticket history',
  description: 'How the admission ticket evolved through review.',
  variants: [
    {
      id: 'history-botanical-v1',
      name: 'Botanical',
      description: 'The first green keepsake.',
      rationale: 'Start from the botanical ticket.',
      color: '#e6eddf',
      component: BotanicalTicket,
    },
    {
      id: 'history-night-v1',
      name: 'Night',
      description: 'A dark pass.',
      rationale: 'Try the ticket at night.',
      color: '#1e302b',
      component: NightTicket,
      labels: ['Set aside'],
    },
    {
      id: 'history-morning-v1',
      name: 'Morning',
      description: 'Warmer paper.',
      rationale: 'Answer the request for warmth.',
      color: '#fff3e0',
      component: MorningTicket,
      from: ['history-botanical-v1'],
      answers: [ticketComments.warmer],
    },
    {
      id: 'history-morning-v2',
      name: 'Morning, softer',
      description: 'Softer still.',
      rationale: 'Answer the request for softness.',
      color: '#fff3e0',
      component: MorningTicket,
      from: ['history-morning-v1'],
      answers: [ticketComments.softer],
      labels: ['Shipped'],
    },
  ],
});
