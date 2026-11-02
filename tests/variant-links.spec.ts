import { expect, test } from '@playwright/test';

test('frame titles copy focused links, and the shortcut follows the active variant', async ({
  page,
  context,
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
    .toBe('http://127.0.0.1:4401/?study=card-exploration&variant=paper-v1');
  await page.goto(link);
  await expect(page.locator('[data-variant-id]')).toHaveCount(1);
  await expect(page.locator('[data-xuui-design] h2')).toContainText(
    'less rush.',
  );
});

test('blocked clipboard access exposes a selectable variant link', async ({
  page,
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
    'http://127.0.0.1:4401/?study=card-exploration&variant=paper-v1',
  );
  expect(
    await fallback.evaluate(
      (element: HTMLInputElement) =>
        element.selectionEnd! - element.selectionStart!,
    ),
  ).toBe((await fallback.inputValue()).length);
});
