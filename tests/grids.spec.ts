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

test('grid controls accept custom measurements and persist separately for each variant', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'light'));
  await page.goto('/?study=grid-study&variant=grid-plain-v1');
  const open = page.getByRole('button', { name: 'Grid settings', exact: true });
  await open.click();
  const settings = page.getByRole('dialog', { name: 'Grids', exact: true });
  const pixelSwitch = settings.getByRole('switch', {
    name: 'Pixel grid',
    exact: true,
  });
  await pixelSwitch.click();
  const size = settings.getByRole('spinbutton', {
    name: 'Pixel size',
    exact: true,
  });
  const pixels = page.locator('[data-grid-type="pixels"]');
  await expect(pixels).toHaveAttribute('data-grid-size', '8');
  for (const value of ['10', '12.5']) {
    await size.fill(value);
    await size.press('Enter');
    await expect(pixels).toHaveCSS(
      'background-size',
      `${value}px ${value}px, ${value}px ${value}px`,
    );
  }
  await size.fill('0');
  await size.press('Enter');
  await expect(size).toHaveAttribute('aria-invalid', 'true');
  await expect(pixels).toHaveAttribute('data-grid-size', '12.5');
  await size.press('Escape');
  await expect(size).toHaveValue('12.5');
  await pixelSwitch.click();
  await expect(pixels).toHaveCount(0);
  await pixelSwitch.click();
  await expect(pixels).toHaveAttribute('data-grid-size', '12.5');
  await settings.getByRole('switch', { name: 'Columns', exact: true }).click();
  const count = settings.getByRole('spinbutton', {
    name: 'Column count',
    exact: true,
  });
  await count.fill('5');
  await count.press('Enter');
  const gutter = settings.getByRole('spinbutton', {
    name: 'Column gutter',
    exact: true,
  });
  await gutter.fill('10.5');
  await gutter.press('Enter');
  const margin = settings.getByRole('spinbutton', {
    name: 'Column margin',
    exact: true,
  });
  await margin.fill('20');
  await margin.press('Enter');
  await expect(page.locator('[data-grid-type="columns"] span')).toHaveCount(5);
  await expect(page.locator('[data-grid-type="columns"]')).toHaveCSS(
    'column-gap',
    '10.5px',
  );
  await settings.getByRole('switch', { name: 'Rows', exact: true }).click();
  const rowCount = settings.getByRole('spinbutton', {
    name: 'Row count',
    exact: true,
  });
  await rowCount.fill('3');
  await rowCount.press('Enter');
  await expect(page.locator('[data-grid-type="rows"] span')).toHaveCount(3);
  await page.screenshot({
    path: '.xuui-test/grid-controls-light.png',
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  const nav = page.getByRole('navigation', { name: 'Variants' });
  await nav.getByRole('link', { name: 'Authored grids', exact: true }).click();
  await expect(pixels).toHaveAttribute('data-grid-size', '10');
  await nav.getByRole('link', { name: 'Without grids', exact: true }).click();
  await page.reload();
  await expect(pixels).toHaveAttribute('data-grid-size', '12.5');
  await open.click();
  await expect(
    settings.getByRole('spinbutton', { name: 'Column count', exact: true }),
  ).toHaveValue('5');
  await page.keyboard.press('Escape');
  await page.keyboard.press('d');
  await open.click();
  await page.screenshot({
    path: '.xuui-test/grid-controls-dark.png',
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(settings).toBeInViewport({ ratio: 1 });
  await settings
    .getByRole('button', { name: 'Reset grids', exact: true })
    .click();
  await expect(pixels).toHaveCount(0);
});
