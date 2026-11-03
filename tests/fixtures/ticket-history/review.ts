/** Comment IDs answered by the ticket history study. */
export const ticketComments = {
  warmer: '6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  softer: '7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  tooDark: '8b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
};

const target = (variantId: string) => ({
  selector: `[data-variant-id="${variantId}"] [data-xuui-design] h2`,
  tagName: 'h2',
  text: 'Ticket',
  accessibleName: 'Ticket',
  bounds: { x: 0, y: 0, width: 200, height: 40 },
  viewport: { width: 1440, height: 1000 },
});
const variant = (id: string, name: string) => ({
  id,
  name,
  description: name,
  rationale: name,
});

/** A submitted review whose comments the ticket history answers. */
export const ticketHistoryReview = {
  schemaVersion: 2,
  id: '9c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f',
  studyId: 'ticket-history',
  submittedAt: '2026-11-03T12:00:00.000Z',
  variants: [
    variant('history-botanical-v1', 'Botanical'),
    variant('history-night-v1', 'Night'),
    variant('history-morning-v1', 'Morning'),
  ],
  comments: [
    {
      id: ticketComments.warmer,
      variantId: 'history-botanical-v1',
      body: 'Make it warmer',
      target: target('history-botanical-v1'),
      createdAt: '2026-11-03T11:58:00.000Z',
    },
    {
      id: ticketComments.tooDark,
      variantId: 'history-night-v1',
      body: 'Too dark',
      target: target('history-night-v1'),
      createdAt: '2026-11-03T11:58:30.000Z',
    },
    {
      id: ticketComments.softer,
      variantId: 'history-morning-v1',
      body: 'Softer still',
      target: target('history-morning-v1'),
      createdAt: '2026-11-03T11:59:00.000Z',
    },
  ],
};
