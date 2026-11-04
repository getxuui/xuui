import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function chooseStudy(page: Page, name: string) {
  const trigger = page.getByRole('combobox', { name: 'Study', exact: true });
  if (!(await trigger.count()))
    await page
      .getByRole('button', { name: 'Expand layers', exact: true })
      .click();
  const fontSize = await trigger.evaluate(
    (element) => getComputedStyle(element).fontSize,
  );
  await trigger.click();
  const option = page.getByRole('option', { name, exact: true });
  await expect(option).toHaveCSS('font-size', fontSize);
  await option.click();
}

const variants = (page: Page) =>
  page.getByRole('navigation', { name: 'Variants', exact: true });

test('Tab switches whole variant rows, Shift+Tab reverses, and Escape leaves the list', async ({
  page,
}) => {
  await page.goto('/?study=sunday-tickets&variant=ticket-botanical-v1');
  const botanical = variants(page).getByRole('link', {
    name: 'Botanical admission — a slower kind of Sunday',
    exact: true,
  });
  const night = variants(page).getByRole('link', {
    name: 'Night pass — small gatherings after hours',
    exact: true,
  });
  await botanical.focus();
  await page.keyboard.press('Tab');
  await expect(night).toBeFocused();
  await expect(page).toHaveURL(/variant=ticket-night-v1$/);
  await page.keyboard.press('Shift+Tab');
  await expect(botanical).toBeFocused();
  await expect(page).toHaveURL(/variant=ticket-botanical-v1$/);
  await page.keyboard.press('Shift+Tab');
  await expect(
    variants(page).getByRole('link', { name: 'All variants', exact: true }),
  ).toBeFocused();
  await expect(page).toHaveURL(/view=all$/);
  await page.keyboard.press('Tab');
  await expect(botanical).toBeFocused();
  await expect(page).not.toHaveURL(/view=all/);
  await expect(botanical.locator('[data-marquee]')).not.toBeFocused();
  await expect(botanical.locator('[data-marquee]')).toHaveCSS(
    'outline-style',
    'none',
  );
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('combobox', { name: 'Study', exact: true }),
  ).toBeFocused();
});

test('arrow shortcuts and the variant list navigate once without intercepting studio controls', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await page.keyboard.press('ArrowUp');
  await expect(page).toHaveURL(/variant=paper-v1$/);
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/variant=after-hours-v1$/);
  await page.keyboard.press('ArrowUp');
  await expect(page).toHaveURL(/variant=paper-v1$/);
  const weight = page.getByRole('slider', { name: 'Font weight', exact: true });
  await weight.focus();
  await weight.press('ArrowUp');
  await expect(page).toHaveURL(/variant=paper-v1$/);
  const study = page.getByRole('combobox', { name: 'Study', exact: true });
  await study.focus();
  await study.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page).toHaveURL(/variant=paper-v1$/);
  await page.keyboard.press('Escape');
  const paper = variants(page).getByRole('link', {
    name: 'Paper',
    exact: true,
  });
  await paper.focus();
  await paper.press('ArrowDown');
  const afterHours = variants(page).getByRole('link', {
    name: 'After hours',
    exact: true,
  });
  await expect(afterHours).toBeFocused();
  await expect(afterHours).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/variant=after-hours-v1$/);
  await paper.click();
  await variants(page)
    .getByRole('link', { name: 'All variants', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Collapse sidebar', exact: true })
    .click();
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/variant=after-hours-v1&view=all$/);
  await expect(page.locator('[data-variant-id]')).toHaveCount(5);
  await page.keyboard.press('ArrowUp');
  await expect(page).toHaveURL(/variant=paper-v1&view=all$/);
});

test('named studies restore their active variant and keep All variants scoped to the study', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'light'));
  await page.goto('/?variant=paper-v1');
  await chooseStudy(page, 'Sunday tickets');
  await expect(page).toHaveURL(
    /study=sunday-tickets&variant=ticket-botanical-v1/,
  );
  await variants(page)
    .getByRole('link', {
      name: 'Night pass — small gatherings after hours',
      exact: true,
    })
    .click();
  await expect(page.locator('.ticket-night')).toBeVisible();
  const ruler = page.getByRole('button', { name: /^Left ruler:/ });
  await ruler.focus();
  await ruler.press('Enter');
  const position = page.getByRole('spinbutton', { name: 'X guide position' });
  await position.fill('45');
  await position.press('Enter');
  await chooseStudy(page, 'Card exploration');
  await expect(page.locator('.sunday-card')).toBeVisible();
  await chooseStudy(page, 'Sunday tickets');
  await expect(page).toHaveURL(/variant=ticket-night-v1/);
  await expect(
    page.getByRole('slider', { name: 'X guide', exact: true }),
  ).toHaveAttribute('aria-valuenow', '45');
  await variants(page)
    .getByRole('link', { name: 'All variants', exact: true })
    .click();
  await expect(page.locator('[data-variant-id]')).toHaveCount(3);
  await chooseStudy(page, 'Card exploration');
  await expect(page.locator('[data-variant-id]')).toHaveCount(5);
  await page.goBack();
  await expect(page.locator('[data-variant-id]')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('[data-variant-id]')).toHaveCount(3);
});

test('long variant names reveal on hover and focus while respecting reduced motion', async ({
  page,
}) => {
  await page.goto('/?study=sunday-tickets&variant=ticket-botanical-v1');
  const selected = variants(page).getByRole('link', {
    name: 'Botanical admission — a slower kind of Sunday',
    exact: true,
  });
  const marquee = selected.locator('[data-marquee]');
  await expect(marquee).toHaveAttribute('data-overflow', 'true');
  const width = (await selected.boundingBox())!.width;
  await selected.hover();
  await expect
    .poll(() => marquee.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(5);
  expect((await selected.boundingBox())!.width).toBeCloseTo(width);
  await page.getByRole('heading', { name: 'State', exact: true }).hover();
  await expect
    .poll(() => marquee.evaluate((element) => element.scrollLeft))
    .toBe(0);
  await selected.focus();
  await expect
    .poll(() => marquee.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => marquee.evaluate((element) => element.scrollLeft))
    .toBe(0);
  await expect(marquee).not.toHaveCSS('mask-image', 'none');
  await expect(selected).toHaveAttribute('aria-current', 'page');
});

test('the study switcher and variant list work in the narrow left drawer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/?variant=paper-v1');
  await chooseStudy(page, 'Sunday tickets');
  await expect(page).toHaveURL(/study=sunday-tickets/);
  await variants(page)
    .getByRole('link', {
      name: 'Night pass — small gatherings after hours',
      exact: true,
    })
    .click();
  await page
    .getByRole('dialog', { name: 'Layers', exact: true })
    .getByRole('button', { name: 'Collapse layers', exact: true })
    .click();
  await expect(page.locator('.ticket-night')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: '.xuui-test/study-navigation-mobile.png',
    fullPage: true,
  });
});

test('variants that arrive after a visit flash once in the list and on the canvas', async ({
  page,
}) => {
  const fresh = page.locator('[data-new-variant]');
  await page.goto('/?variant=paper-v1&view=all');
  await expect(page.locator('[data-variant-id="paper-v1"]')).toBeVisible();
  // The first visit marks every variant as seen.
  await expect(fresh).toHaveCount(0);

  // Pretend the browser last saw the study before Essential was added.
  await page.evaluate(() =>
    localStorage.setItem(
      'xuui:card-exploration:seen-variants:v1',
      JSON.stringify([
        'paper-v1',
        'after-hours-v1',
        'index-v1',
        'soft-focus-v1',
      ]),
    ),
  );
  await page.reload();
  await expect(
    page
      .getByRole('navigation', { name: 'Variants' })
      .locator('[data-new-variant]'),
  ).toHaveAccessibleName(/Essential/);
  await expect(
    page.locator('[data-variant-id="essential-v1"][data-new-variant]'),
  ).toBeVisible();
  await expect(fresh).toHaveCount(0, { timeout: 4000 });

  // Once seen, it doesn't flash again.
  await page.reload();
  await expect(page.locator('[data-variant-id="paper-v1"]')).toBeVisible();
  await expect(fresh).toHaveCount(0);
});

test('canvas navigation reveals the active variant in a scrolled sidebar without taking focus', async ({
  page,
}) => {
  await page.goto('/?variant=essential-v1&view=all');
  const navigation = variants(page);
  const essential = navigation.getByRole('link', {
    name: 'Essential',
    exact: true,
  });
  const resetScroll = async () => {
    const divider = page.getByRole('separator', {
      name: 'Resize pages and layers',
      exact: true,
    });
    await divider.focus();
    await divider.press('Home');
    await navigation.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(essential).not.toBeInViewport();
  };

  // Opening the already-active variant from All must reveal its row too.
  await resetScroll();
  const open = page.getByRole('button', {
    name: 'Open Essential',
    exact: true,
  });
  await page
    .locator('[data-variant-id="essential-v1"] [data-frame-title]')
    .hover();
  await open.click();
  await expect(essential).toHaveAttribute('aria-current', 'page');
  await expect(essential).toBeInViewport({ ratio: 1 });
  await expect(essential).not.toBeFocused();

  // Frame-title selection in All follows the same active-variant change.
  await page.goto('/?variant=paper-v1&view=all');
  await resetScroll();
  await page.keyboard.press('Shift+1');
  const title = page
    .locator('[data-frame-title]')
    .getByRole('button', { name: 'Essential', exact: true });
  await title.click();
  await expect(page).toHaveURL(/variant=essential-v1&view=all$/);
  await expect(essential).toBeInViewport({ ratio: 1 });
  await expect(title).toBeFocused();

  // Keyboard and browser navigation also reveal the selected row.
  await page.getByRole('main', { name: 'Variant canvas' }).focus();
  await page.keyboard.press('ArrowUp');
  await expect(page).toHaveURL(/variant=soft-focus-v1&view=all$/);
  await expect(
    navigation.getByRole('link', { name: 'Soft focus', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.goBack();
  await expect(page).toHaveURL(/variant=essential-v1&view=all$/);
  await expect(essential).toBeInViewport({ ratio: 1 });
});
