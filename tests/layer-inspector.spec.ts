import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const property = (panel: Locator, label: string) =>
  panel
    .locator('dt')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('..')
    .getByRole('definition')
    .locator('[data-layer-value]');

test('selected text exposes rendered properties and follows live parameter changes', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'light'));
  await page.goto('/?study=reading-room&variant=reading-cover-newsreader-v1');
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  const panel = sidebar.getByRole('region', {
    name: 'Selected layer',
    exact: true,
  });
  await expect(panel).toHaveCount(0);
  await page.locator('.reading-info h2').click();
  await expect(panel).toContainText('The quiet atlas');
  await expect(property(panel, 'X')).toHaveText('22px');
  await expect(property(panel, 'Width')).toHaveText('260px');
  await expect(property(panel, 'Font')).toHaveText('Newsreader');
  await expect(property(panel, 'Size')).toHaveText('32px');
  await expect(property(panel, 'Weight')).toHaveText('500');
  await expect(property(panel, 'Line height')).toHaveText('33.6px');
  await expect(property(panel, 'Letter spacing')).toHaveText('-1.44px');
  await expect(property(panel, 'Text color')).toContainText('#283C35');
  await expect(
    panel.locator(
      'input, textarea, select, [role="slider"], [role="combobox"]',
    ),
  ).toHaveCount(0);
  await page.screenshot({
    path: '.xuui-test/layer-inspector-light.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.keyboard.press('d');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({
    path: '.xuui-test/layer-inspector-dark.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  await sidebar
    .getByRole('button', { name: 'Edit Font weight', exact: true })
    .click();
  const weight = sidebar.getByRole('textbox', {
    name: 'Font weight value',
    exact: true,
  });
  await weight.fill('700');
  await weight.press('Enter');
  await page.locator('.reading-info h2').click();
  await expect(property(panel, 'Weight')).toHaveText('700');
  await page.keyboard.press('Escape');
  await sidebar
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('A map for getting lost');
  await page.locator('.reading-info h2').click();
  await expect(panel).toContainText('A map for getting lost');
  await page.keyboard.press('Escape');
  await sidebar.getByRole('combobox', { name: 'Font', exact: true }).click();
  await page.getByRole('option', { name: 'Geist', exact: true }).click();
  await page.locator('.reading-info h2').click();
  await expect(property(panel, 'Font')).toHaveText('Geist');
  await page.setViewportSize({ width: 320, height: 1000 });
  await panel.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  expect(
    await panel.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: '.xuui-test/layer-inspector-narrow.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('keyboard selection inspects groups and combined bounds, then clears on variant change', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  const single = sidebar.getByRole('region', {
    name: 'Selected layer',
    exact: true,
  });
  const multiple = sidebar.getByRole('region', {
    name: 'Selected layers',
    exact: true,
  });
  await page.keyboard.press('Tab');
  await expect(single).toContainText('Paper');
  await expect(property(single, 'Width')).toHaveText('304px');
  await expect(property(single, 'Fill')).toContainText('#FFFEFA');
  await expect(property(single, 'Radius')).toHaveText('8px');
  await expect(single.getByLabel('Typography', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(multiple).toContainText('2 layers');
  await expect(property(multiple, 'Width')).toHaveText('304px');
  await expect(multiple.getByLabel('Appearance', { exact: true })).toHaveCount(
    0,
  );
  await page.keyboard.press('Shift+Enter');
  await expect(single).toContainText('Paper');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(property(single, 'Fill')).toContainText('#E9EDDF');
  await page.keyboard.press('Escape');
  await expect(single).toHaveCount(0);
  for (const name of ['State', 'Props', 'Comments'])
    await expect(
      sidebar.getByRole('region', { name, exact: true }),
    ).toBeVisible();
  await page.locator('[data-xuui-design] h2').click();
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.press('Enter');
  await expect(multiple).toContainText('5 layers');
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/variant=after-hours-v1$/);
  await expect(single).toHaveCount(0);
  await expect(multiple).toHaveCount(0);
});

test('inspector values copy by pointer and keyboard, with a selectable clipboard fallback', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?study=reading-room&variant=reading-cover-newsreader-v1');
  await page.locator('.reading-info h2').click();
  const panel = page.getByRole('region', {
    name: 'Selected layer',
    exact: true,
  });
  await panel
    .getByRole('button', { name: 'Copy layer properties', exact: true })
    .click();
  await expect
    .poll(async () =>
      JSON.parse(await page.evaluate(() => navigator.clipboard.readText())),
    )
    .toMatchObject({
      variantId: 'reading-cover-newsreader-v1',
      bounds: { width: 260 },
      typography: { Font: 'Newsreader' },
    });
  await panel
    .getByRole('button', { name: 'Copy Width: 260px', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('260px');
  await expect(panel.getByRole('status')).toHaveText('Copied Width: 260px');
  const font = panel.getByRole('button', {
    name: 'Copy Font: Newsreader',
    exact: true,
  });
  await font.focus();
  await font.press('Enter');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('Newsreader');
  await expect(font).toBeFocused();
  await expect(property(panel, 'Font')).toHaveText('Newsreader');
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('Clipboard unavailable');
    };
  });
  await panel
    .getByRole('button', { name: 'Copy Line height: 33.6px', exact: true })
    .click();
  const fallback = panel.getByRole('textbox', {
    name: 'Select and copy line height',
    exact: true,
  });
  await expect(fallback).toHaveValue('33.6px');
  await fallback.focus();
  await expect
    .poll(() =>
      fallback.evaluate(
        (input: HTMLInputElement) =>
          input.selectionEnd! - input.selectionStart!,
      ),
    )
    .toBe(6);
});

test('inspection stays in component pixels through measuring, zoom and pan, and clears with the canvas mode', async ({
  page,
}) => {
  await page.goto('/?study=reading-room&variant=reading-cover-v1');
  const canvas = page.getByRole('region', { name: 'Canvas', exact: true });
  const design = page.locator('[data-xuui-design]');
  const heading = page.locator('.reading-info h2');
  const panel = page.getByRole('region', {
    name: 'Selected layer',
    exact: true,
  });
  await heading.click();
  await expect(panel).toBeVisible();
  const geometry = panel
    .getByLabel('Geometry', { exact: true })
    .getByRole('definition');
  const before = await geometry.allTextContents();
  await page.keyboard.down('Alt');
  await page.locator('.reading-buy').hover();
  await expect(panel).toContainText('The quiet atlas');
  await page.keyboard.up('Alt');
  const original = (await design.boundingBox())!;
  const anchor = (await heading.boundingBox())!;
  await page.mouse.move(anchor.x + 10, anchor.y + 10);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -Math.log(1.5) / 0.01);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => (await design.boundingBox())!.width / original.width)
    .toBeCloseTo(1.5, 2);
  await page.mouse.wheel(60, 40);
  await expect.poll(() => geometry.allTextContents()).toEqual(before);
  await page.keyboard.press('r');
  await expect(panel).toBeVisible();
  await page
    .getByRole('button', { name: 'Interact with preview', exact: true })
    .click();
  await expect(panel).toHaveCount(0);
  await page.keyboard.press('v');
  await expect(panel).toHaveCount(0);
  await heading.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press('c');
  await expect(panel).toHaveCount(0);
  await page.keyboard.press('v');
  await heading.click();
  const area = (await canvas.boundingBox())!;
  await page.mouse.click(area.x + 30, area.y + 100);
  await expect(panel).toHaveCount(0);
});
