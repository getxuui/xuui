import { expect, test } from '@playwright/test';

test('D changes the page, sidebar, and canvas theme together', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'light'));
  await page.goto('/?variant=paper-v1');
  const canvas = page.getByRole('region', { name: 'Canvas' });
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  const pageBackground = page.locator('.h-dvh.bg-studio-background');
  const layers = page.getByRole('complementary', {
    name: 'Layers',
    exact: true,
  });
  const studyPicker = layers.getByRole('combobox', { name: 'Study' });
  const activeVariant = layers.getByRole('link', {
    name: 'Paper',
    exact: true,
  });
  const control = sidebar.locator('.parameter-field').first();
  const expectMatchingControls = async () => {
    const background = await control.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await expect(studyPicker).toHaveCSS('background-color', background);
    await expect(activeVariant).toHaveCSS('background-color', background);
    const otherVariant = layers.getByRole('link', {
      name: 'After hours',
      exact: true,
    });
    await otherVariant.hover();
    await expect(otherVariant).toHaveCSS('background-color', background);
  };
  await expectMatchingControls();
  const light = await sidebar.evaluate(
    (element) => getComputedStyle(element).color,
  );
  await page.keyboard.press('d');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expectMatchingControls();
  await expect(sidebar).not.toHaveCSS('color', light);
  await expect(
    sidebar.getByRole('button', { name: 'Collapse sidebar' }),
  ).not.toHaveCSS('color', light);
  await expect(pageBackground).not.toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(canvas).toHaveCSS(
    'background-color',
    await pageBackground.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  );
  // Panels and the canvas share the page background in both themes.
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
  await expect(canvas).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(canvas).toHaveCSS('border-top-width', '1px');
  await page.screenshot({
    path: '.xuui-test/studio-light.png',
    fullPage: true,
  });
});
