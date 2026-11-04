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

test('the link shortcut deep-links selected layers across reloads and browser history', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?variant=paper-v1');
  await page.locator('[data-xuui-design] h2').click();
  await page.keyboard.press('Meta+l');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('layer=');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const url = new URL(link);
  expect(url.searchParams.get('variant')).toBe('paper-v1');
  expect(url.searchParams.getAll('layer')).toHaveLength(1);

  // The frame action still copies the whole variant, even with a selection.
  await page.locator('[data-frame-title]').hover();
  await page
    .getByRole('button', { name: 'Copy link to Paper', exact: true })
    .click();
  await expect
    .poll(async () =>
      new URL(
        await page.evaluate(() => navigator.clipboard.readText()),
      ).searchParams.has('layer'),
    )
    .toBe(false);

  const fresh = await context.newPage();
  const selected = fresh.getByRole('region', {
    name: 'Selected layer',
    exact: true,
  });
  await fresh.goto('/?variant=paper-v1');
  await fresh.goto(link);
  await expect(selected).toContainText('The art of noticing.');
  await expect(fresh).toHaveURL(link);
  await expect
    .poll(async () => {
      const area = (await fresh
        .getByRole('main', { name: 'Variant canvas' })
        .boundingBox())!;
      const node = (await fresh
        .locator('[data-xuui-design] h2')
        .boundingBox())!;
      return (
        Math.abs(node.x + node.width / 2 - area.x - area.width / 2) < 3 &&
        Math.abs(node.y + node.height / 2 - area.y - area.height / 2) < 3
      );
    })
    .toBe(true);
  await fresh.reload();
  await expect(selected).toContainText('The art of noticing.');

  await fresh
    .locator('[data-xuui-design]')
    .getByRole('button', { name: 'Save a seat', exact: true })
    .click();
  await fresh.keyboard.press('Control+l');
  await expect
    .poll(() => fresh.evaluate(() => navigator.clipboard.readText()))
    .toContain('layer=');
  const buttonLink = await fresh.evaluate(() => navigator.clipboard.readText());
  expect(buttonLink).not.toBe(link);
  expect(new URL(buttonLink).searchParams.getAll('layer')).toHaveLength(1);
  await fresh.goto(buttonLink);
  await expect(selected).toContainText('Save a seat');
  await fresh.goBack();
  await expect(selected).toContainText('The art of noticing.');
  await fresh.goBack();
  await expect(fresh).toHaveURL(/variant=paper-v1$/);
  await expect(selected).toHaveCount(0);
  await fresh.close();
});

test('layer links restore grouped selections and retain a clipboard fallback', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?variant=paper-v1');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('region', { name: 'Selected layers', exact: true }),
  ).toContainText('2 layers');
  await page.keyboard.press('Meta+l');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('layer=');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).searchParams.getAll('layer')).toHaveLength(2);
  await page.goto(link);
  await expect(
    page.getByRole('region', { name: 'Selected layers', exact: true }),
  ).toContainText('2 layers');

  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('Blocked')) },
    }),
  );
  await page.keyboard.press('Meta+l');
  const fallback = page.getByRole('textbox', {
    name: 'Link to Paper',
    exact: true,
  });
  await expect(fallback).toBeFocused();
  await expect(fallback).toHaveValue(link);
});

test('invalid, missing and out-of-scope layer targets leave the variant usable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const layer of ['[', '[data-missing-layer]', '.variant-list-link']) {
    const params = new URLSearchParams({
      study: 'card-exploration',
      variant: 'paper-v1',
      layer,
    });
    await page.goto(`/?${params}`);
    await expect(page.locator('[data-xuui-design] h2')).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Selected layer', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('region', { name: 'Props', exact: true }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
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

test('frame-title selection keeps Enter hierarchy shortcuts available', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await page
    .locator('[data-frame-title]')
    .getByRole('button', { name: 'Paper', exact: true })
    .click();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('region', { name: 'Selected layers', exact: true }),
  ).toContainText('2 layers');
  await page.keyboard.press('Shift+Enter');
  await expect(
    page
      .getByRole('status', { name: 'Selected element' })
      .locator('[data-selected-tag]'),
  ).toHaveAttribute('data-selected-tag', 'article');
});

test('clicking a frame title fits its variant to the canvas, like Shift+2', async ({
  page,
}) => {
  const canvas = page.getByRole('main', { name: 'Variant canvas' });
  const fitted = async (variantId: string) => {
    const area = (await canvas.boundingBox())!;
    const box = (await page
      .locator(`[data-variant-id="${variantId}"] [data-xuui-design]`)
      .boundingBox())!;
    const fills = Math.max(
      box.width / (area.width - 96),
      box.height / (area.height - 96),
    );
    const centred =
      Math.abs(box.x + box.width / 2 - (area.x + area.width / 2)) < 3 &&
      Math.abs(box.y + box.height / 2 - (area.y + area.height / 2)) < 3;
    return fills > 0.97 && fills < 1.03 && centred;
  };

  await page.goto('/?variant=paper-v1&view=all');
  await page
    .locator('[data-frame-title]')
    .getByRole('button', { name: 'After hours', exact: true })
    .click();
  await expect(page).toHaveURL(/variant=after-hours-v1/);
  await expect.poll(() => fitted('after-hours-v1')).toBe(true);

  await page.goto('/?variant=paper-v1');
  await page
    .locator('[data-frame-title]')
    .getByRole('button', { name: 'Paper', exact: true })
    .click();
  await expect.poll(() => fitted('paper-v1')).toBe(true);
});
