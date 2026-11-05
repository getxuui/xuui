import { expect, test } from '@playwright/test';

test('All hides variant parameters on direct visits and after reloads', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1&view=all');
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    await expect(page.locator('[data-variant-id]')).toHaveCount(5);
    for (const name of ['State', 'Props'])
      await expect(
        sidebar.getByRole('region', { name, exact: true }),
      ).toHaveCount(0);
    await expect(
      sidebar.getByRole('button', { name: 'Copy parameters', exact: true }),
    ).toHaveCount(0);
    await expect(
      sidebar.getByRole('region', { name: 'Comments', exact: true }),
    ).toBeVisible();
  }

  await page
    .locator('[data-variant-id="paper-v1"] [data-frame-title]')
    .getByRole('button', { name: 'Paper', exact: true })
    .click();
  await expect(
    sidebar.getByRole('region', { name: 'Selected layer', exact: true }),
  ).toContainText('Paper');
  await expect(
    sidebar.getByRole('button', {
      name: 'Copy layer properties',
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  for (const name of ['State', 'Props'])
    await expect(
      sidebar.getByRole('region', { name, exact: true }),
    ).toHaveCount(0);
});

test('leaving All restores each variant’s own parameters', async ({ page }) => {
  await page.goto('/?variant=paper-v1');
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  const navigation = page.getByRole('navigation', { name: 'Variants' });
  const favourited = sidebar.getByRole('switch', { name: 'Favourited?' });
  const weight = sidebar.getByRole('slider', {
    name: 'Font weight',
    exact: true,
  });
  await favourited.click();
  await weight.focus();
  await weight.press('ArrowRight');
  await expect(weight).toHaveAttribute('aria-valuenow', '600');
  await navigation.getByRole('link', { name: 'All variants' }).click();
  for (const name of ['State', 'Props'])
    await expect(
      sidebar.getByRole('region', { name, exact: true }),
    ).toHaveCount(0);
  await navigation
    .getByRole('link', { name: 'After hours', exact: true })
    .click();
  await expect(favourited).not.toBeChecked();
  await expect(weight).toHaveAttribute('aria-valuenow', '500');
  await navigation.getByRole('link', { name: 'Paper', exact: true }).click();
  await expect(favourited).toBeChecked();
  await expect(weight).toHaveAttribute('aria-valuenow', '600');
  await expect(
    sidebar.getByRole('combobox', { name: 'Reservation', exact: true }),
  ).toBeVisible();
});
