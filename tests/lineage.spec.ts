import { expect, test } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineStudy } from '../src/xuui/model';
import { ticketHistoryReview } from './fixtures/ticket-history/review';

const reviewFile = resolve(
  '.xuui-test/reviews',
  `${ticketHistoryReview.id}.json`,
);

test.beforeAll(async () => {
  await mkdir(resolve('.xuui-test/reviews'), { recursive: true });
  await writeFile(reviewFile, JSON.stringify(ticketHistoryReview));
});
test.afterAll(async () => {
  await rm(reviewFile, { force: true });
});

test('All lays a study with lineage out as its history, labelled with review comments', async ({
  page,
}) => {
  await page.goto(
    '/?study=ticket-history&variant=history-botanical-v1&view=all',
  );
  const layout = page.locator('[data-lineage]');
  await expect(layout).toBeVisible();
  const columns = layout.locator(':scope > .lineage-column');
  await expect(columns).toHaveCount(3);
  await expect(columns.nth(0).locator('[data-variant-id]')).toHaveCount(2);
  await expect(columns.nth(2).locator('[data-variant-id]')).toHaveAttribute(
    'data-variant-id',
    'history-morning-v2',
  );

  await expect(page.locator('[data-lineage-line]')).toHaveCount(2);
  await expect(
    page.locator(
      '[data-lineage-label="history-botanical-v1:history-morning-v1"]',
    ),
  ).toContainText('Make it warmer');
  await expect(
    page.locator(
      '[data-lineage-label="history-morning-v1:history-morning-v2"]',
    ),
  ).toContainText('Softer still');
  // Comments that didn't lead to a new variant stay beside their variant.
  await expect(
    page.locator('[data-lineage-verdict="history-night-v1"]'),
  ).toContainText('Too dark');
  await expect(
    page
      .locator('[data-variant-id="history-morning-v2"]')
      .locator('[data-variant-label]'),
  ).toHaveText('Shipped');

  // Lines live in the canvas scene, so they pan with the frames.
  const moved = await page.evaluate(() => {
    const line = document.querySelector('[data-lineage-line]')!;
    const before = line.getBoundingClientRect().x;
    document.querySelector('main[aria-label="Variant canvas"]')!.dispatchEvent(
      new WheelEvent('wheel', {
        deltaX: 80,
        bubbles: true,
        cancelable: true,
      }),
    );
    return line.getBoundingClientRect().x - before;
  });
  expect(moved).toBe(-80);
});

test('the focused view and studies without lineage keep the usual layout', async ({
  page,
}) => {
  await page.goto('/?study=ticket-history&variant=history-morning-v1');
  await expect(page.locator('[data-variant-id]')).toHaveCount(1);
  await expect(page.locator('[data-lineage]')).toHaveCount(0);
  await page.goto('/?variant=paper-v1&view=all');
  await expect(page.locator('[data-variant-id="paper-v1"]')).toBeVisible();
  await expect(page.locator('[data-lineage]')).toHaveCount(0);
});

test('lineage must stay within the study and never loop', () => {
  const variant = (id: string, from?: string[]) => ({
    id,
    name: id,
    description: id,
    rationale: id,
    color: '#ffffff',
    component: () => null,
    from,
  });
  expect(() =>
    defineStudy({
      id: 'study',
      name: 'Study',
      description: 'Study',
      variants: [variant('a-v1', ['missing-v1'])],
    }),
  ).toThrow(/unknown variant missing-v1/);
  expect(() =>
    defineStudy({
      id: 'study',
      name: 'Study',
      description: 'Study',
      variants: [variant('a-v1', ['b-v1']), variant('b-v1', ['a-v1'])],
    }),
  ).toThrow(/loops/);
});
