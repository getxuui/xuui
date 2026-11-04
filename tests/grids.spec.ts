import { expect, test } from '@playwright/test';
import { defineStudy } from '../src/xuui/model';
import type { Grid } from '../src/xuui/grids';
import { gridStudy } from './fixtures/grid-study';

test('authored grids validate free pixel sizes and bounded layout counts', () => {
  const withGrids = (grids: Grid[]) =>
    defineStudy({
      ...gridStudy,
      variants: [{ ...gridStudy.variants[0], grids }],
    });
  for (const size of [8, 10, 12.5])
    expect(() => withGrids([{ type: 'pixels', size }])).not.toThrow();
  for (const size of [0, -1, Infinity])
    expect(() => withGrids([{ type: 'pixels', size }])).toThrow();
  expect(() =>
    withGrids([{ type: 'columns', count: 1.5, gutter: 10, margin: 20 }]),
  ).toThrow();
  expect(() =>
    withGrids([{ type: 'rows', count: 4, gutter: -1, margin: 20 }]),
  ).toThrow();
  expect(() =>
    withGrids([
      { type: 'pixels', size: 8 },
      { type: 'pixels', size: 10 },
    ]),
  ).toThrow();
});

test('pixel, column and row grids follow the design through zoom and pan without intercepting layers', async ({
  page,
}) => {
  await page.goto('/?study=grid-study&variant=grid-authored-v1');
  const design = page.locator('[data-xuui-design]');
  const pixels = page.locator('[data-grid-type="pixels"]');
  const columns = page.locator('[data-grid-type="columns"]');
  const rows = page.locator('[data-grid-type="rows"]');
  await expect(pixels).toHaveCSS('background-size', '10px 10px, 10px 10px');
  await expect(columns.locator('span')).toHaveCount(4);
  await expect(rows.locator('span')).toHaveCount(3);
  const bounds = (await design.boundingBox())!;
  const pixelBounds = (await pixels.boundingBox())!;
  expect(pixelBounds.x).toBeCloseTo(bounds.x);
  expect(pixelBounds.y).toBeCloseTo(bounds.y);
  expect(pixelBounds.width).toBeCloseTo(360);
  expect(pixelBounds.height).toBeCloseTo(240);
  const firstColumn = (await columns.locator('span').first().boundingBox())!;
  expect(firstColumn.x - bounds.x).toBeCloseTo(20);
  expect(firstColumn.width).toBeCloseTo(72.5);
  const firstRow = (await rows.locator('span').first().boundingBox())!;
  expect(firstRow.y - bounds.y).toBeCloseTo(12);
  expect(firstRow.height).toBeCloseTo(68);
  await design.getByRole('heading').click();
  await expect(
    page.getByRole('region', { name: 'Selected layer', exact: true }),
  ).toContainText('Aligned by design');
  const canvas = (await page
    .getByRole('region', { name: 'Canvas', exact: true })
    .boundingBox())!;
  await page.mouse.move(
    canvas.x + canvas.width / 2,
    canvas.y + canvas.height / 2,
  );
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -Math.log(1.5) / 0.01);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => (await pixels.boundingBox())!.width)
    .toBeCloseTo(540, 0);
  await page.mouse.wheel(80, 30);
  const moved = (await design.boundingBox())!;
  const movedGrid = (await pixels.boundingBox())!;
  expect(movedGrid.x).toBeCloseTo(moved.x);
  expect(movedGrid.y).toBeCloseTo(moved.y);
  expect(
    (await columns.locator('span').first().boundingBox())!.width,
  ).toBeCloseTo(72.5 * 1.5);
});

test('view settings edit grids the agent set up and persist them per variant', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'light'));
  await page.goto('/?study=grid-study&variant=grid-plain-v1');
  const open = page.getByRole('button', { name: 'View settings', exact: true });
  await open.click();
  const settings = page.getByRole('dialog', { name: 'View', exact: true });
  // Without authored layout grids, only the pixel grid is offered.
  await expect(settings.getByRole('switch', { name: 'Columns' })).toHaveCount(
    0,
  );
  await expect(settings).toContainText('Agent hasn’t set up columns or rows.');
  const pixelGrid = settings.getByRole('region', { name: 'Pixel grid' });
  const pixelSwitch = pixelGrid.getByRole('switch', { name: 'Pixel grid' });
  const size = pixelGrid.getByRole('slider', { name: 'Size' });
  // Values fold away, out of reach, while their grid is off.
  const folded = pixelGrid.locator('[inert]');
  await expect(folded).toHaveCount(1);
  await pixelSwitch.click();
  await expect(folded).toHaveCount(0);
  await expect(size).toBeVisible();
  const pixels = page.locator('[data-grid-type="pixels"]');
  await expect(pixels).toHaveAttribute('data-grid-size', '8');
  await pixelGrid.getByRole('button', { name: 'Edit Size' }).click();
  const sizeValue = pixelGrid.getByRole('textbox', { name: 'Size value' });
  await sizeValue.fill('12.5');
  await sizeValue.press('Enter');
  await expect(pixels).toHaveCSS(
    'background-size',
    '12.5px 12.5px, 12.5px 12.5px',
  );
  await pixelSwitch.click();
  await expect(pixels).toHaveCount(0);
  await pixelSwitch.click();
  await expect(pixels).toHaveAttribute('data-grid-size', '12.5');

  // Rulers and buffer zones are canvas-wide view preferences.
  await settings.getByRole('switch', { name: 'Rulers and guides' }).click();
  await expect(page.locator('[data-ruler-axis]')).toHaveCount(0);
  const zones = page.locator('[data-canvas-decoration]').first();
  await settings.getByRole('switch', { name: 'Buffer zones' }).click();
  await expect(zones).toHaveCSS('opacity', '0');
  await page.screenshot({
    path: '.xuui-test/view-settings-light.png',
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');

  // A variant with authored layout grids offers columns and rows.
  const nav = page.getByRole('navigation', { name: 'Variants' });
  await nav.getByRole('link', { name: 'Authored grids', exact: true }).click();
  await expect(pixels).toHaveAttribute('data-grid-size', '10');
  await open.click();
  await expect(settings).not.toContainText('Agent hasn’t set up');
  const columns = settings.getByRole('region', { name: 'Columns' });
  await columns.getByRole('button', { name: 'Edit Count' }).click();
  const count = columns.getByRole('textbox', { name: 'Count value' });
  await count.fill('5');
  await count.press('Enter');
  await expect(page.locator('[data-grid-type="columns"] span')).toHaveCount(5);
  await page.keyboard.press('Escape');

  await nav.getByRole('link', { name: 'Without grids', exact: true }).click();
  await page.reload();
  await expect(pixels).toHaveAttribute('data-grid-size', '12.5');
  await expect(zones).toHaveCSS('opacity', '0');
  await open.click();
  await settings.getByRole('switch', { name: 'Buffer zones' }).click();
  await expect(zones).toHaveCSS('opacity', '1');
  await page.keyboard.press('d');
  await page.screenshot({
    path: '.xuui-test/view-settings-dark.png',
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(settings).toBeInViewport({ ratio: 1 });
  await settings
    .getByRole('button', { name: 'Reset grids', exact: true })
    .click();
  await expect(pixels).toHaveCount(0);
});

test('stored layout grids never appear on a variant the agent did not set up', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'xuui:grid-study:grid-plain-v1:grids:v1',
      JSON.stringify([{ type: 'columns', count: 4, gutter: 8, margin: 8 }]),
    ),
  );
  await page.goto('/?study=grid-study&variant=grid-plain-v1');
  await expect(page.locator('[data-xuui-design]')).toBeVisible();
  await expect(page.locator('[data-grid-type="columns"]')).toHaveCount(0);
});
