import { expect, test } from '@playwright/test';

test('D changes the page, sidebar, and canvas theme together', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'light'));
  await page.goto('/?variant=paper-v1');
  const canvas = page.getByRole('region', { name: 'Canvas' });
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  const pageBackground = page.locator('.h-dvh.bg-studio-background');
  const light = await sidebar.evaluate(
    (element) => getComputedStyle(element).color,
  );
  await page.keyboard.press('d');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(sidebar).not.toHaveCSS('color', light);
  await expect(
    sidebar.getByRole('button', { name: 'Collapse sidebar' }),
  ).not.toHaveCSS('color', light);
  await expect(pageBackground).not.toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(canvas).toHaveCSS('background-color', 'oklch(0.208 0.03 150)');
  // Panels sit on the page background in both themes; only the canvas is inset.
  await expect(sidebar).toHaveCSS(
    'background-color',
    await pageBackground.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  );
  await sidebar
    .getByRole('combobox', { name: 'Reservation', exact: true })
    .click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: '.xuui-test/studio-dark.png', fullPage: true });

  await page.keyboard.press('d');
  await expect(sidebar).toHaveCSS('color', light);
  await expect(
    sidebar.getByRole('button', { name: 'Collapse sidebar' }),
  ).toHaveCSS('color', light);
  await expect(pageBackground).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(canvas).toHaveCSS('background-color', 'oklch(0.984 0.004 150)');
  await expect(canvas).toHaveCSS('border-top-width', '1px');
  await page.screenshot({
    path: '.xuui-test/studio-light.png',
    fullPage: true,
  });
});
