import { expect, test } from '@playwright/test';

test('Cover type variants load their fonts and retain the card interactions', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const [id, family] of [
    ['newsreader', 'Newsreader Variable'],
    ['geist', 'Geist Variable'],
    ['fraunces', 'Fraunces Variable'],
  ]) {
    await page.goto(`/?study=reading-room&variant=reading-cover-${id}-v1`);
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator('.reading-card');
    const title = card.getByRole('heading', { level: 2 });
    await expect(title).toHaveCSS(
      'font-family',
      `"${family}", ${id === 'geist' ? 'sans-serif' : 'serif'}`,
    );
    expect(
      await page.evaluate(
        (name) => document.fonts.check(`500 32px "${name}"`),
        family,
      ),
    ).toBe(true);
    await expect(title).toHaveText('The quiet atlas');
    await page
      .getByRole('button', { name: 'Interact with preview', exact: true })
      .click();
    await card.getByRole('button', { name: 'Add to bag', exact: true }).click();
    await expect(
      card.getByRole('button', { name: 'Added to bag', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('link', { name: 'Cover', exact: true }).click();
    await expect(page).toHaveURL(/variant=reading-cover-v1$/);
    await expect(page.locator('.reading-info h2')).toHaveCSS(
      'font-family',
      'Georgia, serif',
    );
  }
  expect(errors).toEqual([]);
});
