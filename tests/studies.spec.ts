import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function chooseStudy(page: Page, name: string) {
  const trigger = page.getByRole('combobox', { name: 'Study', exact: true });
  const fontSize = await trigger.evaluate(
    (element) => getComputedStyle(element).fontSize,
  );
  await trigger.click();
  const option = page.getByRole('option', { name, exact: true });
  await expect(option).toHaveCSS('font-size', fontSize);
  await option.click();
}

test('arrow shortcuts move between variants without intercepting controls', async ({
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
  const picker = page.getByRole('combobox', { name: 'Variant', exact: true });
  await picker.focus();
  await picker.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page).toHaveURL(/variant=paper-v1$/);
  await page.keyboard.press('Escape');
  await picker.click();
  await page.getByRole('option', { name: 'All variants', exact: true }).click();
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
  await expect(page.locator('.ticket-card')).toBeVisible();
  const picker = page.getByRole('combobox', { name: 'Variant', exact: true });
  await picker.click();
  await expect(page.getByRole('option').first()).toHaveText('All variants');
  await expect(page.locator('[data-slot="select-separator"]')).toBeVisible();
  await page
    .getByRole('option', {
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
  await picker.click();
  await page.getByRole('option', { name: 'All variants', exact: true }).click();
  await expect(page.locator('[data-variant-id]')).toHaveCount(3);
  await chooseStudy(page, 'Card exploration');
  await expect(page.locator('[data-variant-id]')).toHaveCount(5);
  await page.goBack();
  await expect(page.locator('[data-variant-id]')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('[data-variant-id]')).toHaveCount(3);
  const canvas = (await page
    .getByRole('region', { name: 'Canvas', exact: true })
    .boundingBox())!;
  await page.mouse.move(
    canvas.x + canvas.width / 2,
    canvas.y + canvas.height / 2,
  );
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -Math.log(0.55) / 0.01);
  await page.keyboard.up('Control');
  await page.screenshot({
    path: '.xuui-test/sunday-ticket-study.png',
    fullPage: true,
  });
});

test('long variant names scroll within masks and the colored tick stays unchanged on hover', async ({
  page,
}) => {
  await page.goto('/?study=sunday-tickets&variant=ticket-botanical-v1');
  const picker = page.getByRole('combobox', { name: 'Variant', exact: true });
  const title = picker.locator('[data-marquee]');
  await expect(title).toHaveAttribute('data-overflow', 'true');
  const width = (await picker.boundingBox())!.width;
  await picker.hover();
  await expect
    .poll(() => title.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(5);
  expect((await picker.boundingBox())!.width).toBeCloseTo(width);
  await page.getByRole('heading', { name: 'State', exact: true }).hover();
  await expect
    .poll(() => title.evaluate((element) => element.scrollLeft))
    .toBe(0);
  await picker.click();
  const selected = page.getByRole('option', {
    name: 'Botanical admission — a slower kind of Sunday',
    exact: true,
  });
  await expect(selected).toHaveCSS(
    'font-size',
    await picker.evaluate((element) => getComputedStyle(element).fontSize),
  );
  const marquee = selected.locator('[data-marquee]');
  await expect(marquee).toHaveAttribute('data-overflow', 'true');
  const icon = selected.locator('.lucide-circle-check');
  const path = icon.locator('path');
  const stroke = await path.evaluate(
    (element) => getComputedStyle(element).stroke,
  );
  await selected.hover();
  await expect(icon.locator('circle')).toHaveCSS('stroke', 'none');
  await expect(path).toHaveCSS('stroke', stroke);
  await expect
    .poll(() => marquee.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(5);
  await page.screenshot({
    path: '.xuui-test/variant-menu-marquee.png',
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => marquee.evaluate((element) => element.scrollLeft))
    .toBe(0);
  await expect(marquee).not.toHaveCSS('mask-image', 'none');
});

test('the study navigation remains usable on a narrow canvas layout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/?variant=paper-v1');
  await expect(
    page.getByRole('complementary', { name: 'Sidebar' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Canvas', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await chooseStudy(page, 'Sunday tickets');
  await expect(page).toHaveURL(/study=sunday-tickets/);
  const picker = page.getByRole('combobox', { name: 'Variant', exact: true });
  await picker.click();
  await page
    .getByRole('option', {
      name: 'Night pass — small gatherings after hours',
      exact: true,
    })
    .click();
  await expect(page.locator('.ticket-night')).toBeVisible();
  await page.screenshot({
    path: '.xuui-test/study-navigation-mobile.png',
    fullPage: true,
  });
});
