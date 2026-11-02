import { expect, test } from '@playwright/test';

test('book cards expose useful controls and support saving, excerpts and adding to the bag', async ({
  page,
}) => {
  for (const variant of ['cover', 'editorial', 'night']) {
    await page.goto(`/?study=reading-room&variant=reading-${variant}-v1`);
    const card = page.locator(`.reading-${variant}`);
    const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
    await expect(card).toBeVisible();
    await card.screenshot({ path: `.xuui-test/reading-${variant}.png` });
    await sidebar
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill('An atlas of small discoveries');
    await expect(card.getByRole('heading', { level: 2 })).toHaveText(
      'An atlas of small discoveries',
    );
    await sidebar
      .getByRole('switch', { name: 'Show summary?', exact: true })
      .click();
    await expect(card.getByText(/Places to wander/)).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Interact with preview', exact: true })
      .click();
    await card
      .getByRole('button', { name: 'Save to reading list', exact: true })
      .click();
    await expect(
      card.getByRole('button', {
        name: 'Remove from reading list',
        exact: true,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    await card
      .getByRole('button', { name: 'Read an excerpt', exact: true })
      .click();
    await expect(card.getByText(/Start with the path/)).toBeVisible();
    await card.getByRole('button', { name: 'Add to bag', exact: true }).click();
    await expect(
      sidebar.getByRole('combobox', { name: 'Bag', exact: true }),
    ).toContainText('Added');
    await card
      .getByRole('button', { name: 'Added to bag', exact: true })
      .click();
    await expect(
      sidebar.getByRole('combobox', { name: 'Bag', exact: true }),
    ).toContainText('Not added');
  }
});

test('the card study replaces the meta examples and its variants work side by side', async ({
  page,
}) => {
  await page.goto('/?study=comment-system&variant=comments-threads-v1');
  await expect(page).toHaveURL(/study=card-exploration&variant=paper-v1$/);
  const navigation = page.getByRole('complementary', {
    name: 'Layers',
    exact: true,
  });
  await navigation
    .getByRole('combobox', { name: 'Study', exact: true })
    .click();
  await expect(
    page.getByRole('option', { name: 'Comment system', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('option', { name: 'Reading room', exact: true }).click();
  await page.getByRole('link', { name: 'All variants', exact: true }).click();
  await expect(page.locator('[data-variant-id]')).toHaveCount(6);
  await expect(page.locator('.reading-cover')).toHaveCount(4);
  await expect(page.locator('.reading-editorial')).toBeAttached();
  await expect(page.locator('.reading-night')).toBeAttached();
  await page.setViewportSize({ width: 375, height: 1000 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
});
