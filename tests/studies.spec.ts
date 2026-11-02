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
