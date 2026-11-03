import { expect, test } from '@playwright/test';

test('frame titles copy focused links, and the shortcut follows the active variant', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?variant=paper-v1&view=all');
  const frame = page.locator('[data-variant-id="after-hours-v1"]');
  const copy = frame.getByRole('button', {
    name: 'Copy link to After hours',
    exact: true,
  });
  await expect(copy).toHaveCSS('opacity', '0');
  await frame.locator('[data-frame-title]').hover();
  await expect(copy).toHaveCSS('opacity', '1');
  await copy.click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).search).toBe(
    '?study=card-exploration&variant=after-hours-v1',
  );
  await page
    .getByRole('navigation', { name: 'Variants', exact: true })
    .getByRole('link', { name: 'Paper', exact: true })
    .click();
  await page.keyboard.press('Meta+l');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(new URL('/?study=card-exploration&variant=paper-v1', baseURL).href);
  await page.goto(link);
  await expect(page.locator('[data-variant-id]')).toHaveCount(1);
  await expect(page.locator('[data-xuui-design] h2')).toContainText(
    'less rush.',
  );
});

test('blocked clipboard access exposes a selectable variant link', async ({
  page,
  baseURL,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('Blocked')) },
    }),
  );
  await page.goto('/?variant=paper-v1');
  await page.locator('[data-frame-title]').hover();
  await page
    .getByRole('button', { name: 'Copy link to Paper', exact: true })
    .click();
  const fallback = page.getByRole('textbox', {
    name: 'Link to Paper',
    exact: true,
  });
  await expect(fallback).toBeFocused();
  await expect(fallback).toHaveValue(
    new URL('/?study=card-exploration&variant=paper-v1', baseURL).href,
  );
  expect(
    await fallback.evaluate(
      (element: HTMLInputElement) =>
        element.selectionEnd! - element.selectionStart!,
    ),
  ).toBe((await fallback.inputValue()).length);
});

test('clicking a frame title selects the variant’s top layer', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const layers = page.getByRole('complementary', {
    name: 'Layers',
    exact: true,
  });
  const selected = layers.locator('[role="treeitem"][aria-selected="true"]');
  await page
    .locator('[data-frame-title]')
    .getByRole('button', { name: 'Paper', exact: true })
    .click();
  await expect(selected).toHaveCount(1);
  await expect(selected).toHaveAccessibleName(/^Paper/);
  await expect(
    page.getByRole('region', { name: 'Selected layer' }),
  ).toBeVisible();

  await page.goto('/?variant=paper-v1&view=all');
  await page
    .locator('[data-frame-title]')
    .getByRole('button', { name: 'After hours', exact: true })
    .click();
  await expect(page).toHaveURL(/variant=after-hours-v1/);
  await expect(selected).toHaveCount(1);
  await expect(
    page.getByRole('region', { name: 'Selected layer' }),
  ).toBeVisible();
});

test('from All, a frame title opens its variant and keeps its size when zoomed out', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1&view=all');
  const titles = page.locator('[data-frame-title]');
  const after = titles.filter({
    has: page.getByRole('button', { name: 'After hours', exact: true }),
  });

  // Each variant starts as one collapsed row in Layers.
  const layers = page.getByRole('tree', { name: 'Component layers' });
  await expect(layers.locator('[aria-expanded="true"]')).toHaveCount(0);

  // Titles hold their on-screen size at any zoom.
  const before = (await after.boundingBox())!;
  await page.keyboard.press('Shift+1');
  await expect
    .poll(async () => Math.round((await after.boundingBox())!.height))
    .toBe(Math.round(before.height));

  // The hover icon opens the variant on its own.
  await after.hover();
  await after.getByRole('button', { name: 'Open After hours' }).click();
  await expect(page).toHaveURL(/variant=after-hours-v1$/);
  await expect(page.locator('[data-variant-id]')).toHaveCount(1);

  // So does double-clicking the title.
  await page.goto('/?variant=paper-v1&view=all');
  await titles.getByRole('button', { name: 'Paper', exact: true }).dblclick();
  await expect(page).toHaveURL(/variant=paper-v1$/);
  await expect(page.locator('[data-variant-id]')).toHaveCount(1);
});
