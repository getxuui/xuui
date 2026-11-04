import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function dragFromRuler(
  page: Page,
  edge: 'Top' | 'Left',
  x: number,
  y: number,
) {
  const ruler = await page
    .getByRole('button', { name: new RegExp(`^${edge} ruler:`) })
    .boundingBox();
  if (!ruler) throw new Error('Ruler is missing');
  await page.mouse.move(
    ruler.x + (edge === 'Left' ? 5 : ruler.width / 2),
    ruler.y + (edge === 'Top' ? 5 : ruler.height / 2),
  );
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 8 });
  await page.mouse.up();
}

test('guides drag in both axes, accept precise values, and stay relative to the component', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const component = page.locator('[data-xuui-design]');
  await expect(component).toBeVisible();
  const box = (await component.boundingBox())!;
  const xZero = page.locator('[data-ruler-axis="x"][data-ruler-value="0"]');
  const yZero = page.locator('[data-ruler-axis="y"][data-ruler-value="0"]');
  await expect(xZero).toBeVisible();
  await expect(yZero).toBeVisible();
  const xLabel = (await xZero.boundingBox())!;
  expect(xLabel.x + xLabel.width / 2).toBeCloseTo(box.x);
  const yLabel = (await yZero.boundingBox())!;
  expect(yLabel.y + yLabel.height / 2).toBeCloseTo(box.y);
  await expect(
    page.locator('[data-ruler-axis="x"][data-ruler-value="-64"]'),
  ).toBeVisible();

  await dragFromRuler(page, 'Top', box.x + 40, box.y + 60);
  const horizontal = page.getByRole('slider', { name: 'Y guide', exact: true });
  await expect(horizontal).toBeVisible();
  await dragFromRuler(page, 'Left', box.x + 80, box.y + 100);
  const vertical = page.getByRole('slider', { name: 'X guide', exact: true });
  await expect(vertical).toBeVisible();

  await vertical.click({ position: { x: 5, y: 80 } });
  const input = page.getByRole('spinbutton', { name: 'X guide position' });
  await expect(input).toBeFocused();
  await input.fill('123.5');
  await expect(vertical).toHaveAttribute('aria-valuenow', '123.5');
  await input.press('Enter');
  await expect(vertical).toHaveAttribute('aria-valuenow', '123.5');
  expect(
    (await vertical.locator('[data-guide-line]').boundingBox())!.x,
  ).toBeCloseTo(box.x + 123.5);

  await horizontal.click({ position: { x: 80, y: 5 } });
  const yInput = page.getByRole('spinbutton', { name: 'Y guide position' });
  await yInput.fill('-20');
  await yInput.press('Enter');
  await expect(horizontal).toHaveAttribute('aria-valuenow', '-20');
  expect(
    (await horizontal.locator('[data-guide-line]').boundingBox())!.y,
  ).toBeCloseTo(box.y - 20);

  await page.setViewportSize({ width: 1200, height: 900 });
  await expect
    .poll(async () => {
      const origin = (await component.boundingBox())!.x;
      return Math.abs(
        (await vertical.locator('[data-guide-line]').boundingBox())!.x -
          origin -
          123.5,
      );
    })
    .toBeLessThan(1);
  await page.reload();
  await expect(vertical).toHaveAttribute('aria-valuenow', '123.5');
  await expect(horizontal).toHaveAttribute('aria-valuenow', '-20');
});

test('guide editing validates, cancels, and supports keyboard placement and deletion', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const ruler = page.getByRole('button', { name: /^Left ruler:/ });
  await ruler.focus();
  await ruler.press('Enter');
  const guide = page.getByRole('slider', { name: 'X guide', exact: true });
  const input = page.getByRole('spinbutton', { name: 'X guide position' });
  await expect(input).toHaveValue('0');
  await input.fill('999999');
  await input.press('Enter');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(guide).toHaveAttribute('aria-valuenow', '0');
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(guide).toBeFocused();
  await guide.press('ArrowRight');
  await guide.press('Shift+ArrowRight');
  await expect(guide).toHaveAttribute('aria-valuenow', '11');
  await guide.press('Delete');
  await expect(guide).toHaveCount(0);

  // Canvas selection and guide cancellation share the Escape key.
  await page.locator('[data-xuui-design] h2').click();
  const area = (await ruler.boundingBox())!;
  await page.mouse.move(area.x + 5, area.y + 100);
  await page.mouse.down();
  await page.mouse.move(area.x + 200, area.y + 100, { steps: 5 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByRole('slider', { name: /^[XY] guide$/ })).toHaveCount(
    0,
  );
});

test('submitting a blank guide value removes it, while Escape restores its position', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'light'));
  await page.goto('/?variant=paper-v1');
  const left = page.getByRole('button', { name: /^Left ruler:/ });
  await left.focus();
  await left.press('Enter');
  const input = page.getByRole('spinbutton', { name: 'X guide position' });
  const guide = page.getByRole('slider', { name: 'X guide', exact: true });
  await input.fill('-103');
  await input.selectText();
  await page.screenshot({
    path: '.xuui-test/guide-editor-light.png',
    fullPage: true,
  });
  await input.press('Enter');
  await guide.click({ position: { x: 5, y: 80 } });
  await input.fill('');
  await input.press('Escape');
  await expect(guide).toHaveAttribute('aria-valuenow', '-103');
  await guide.click({ position: { x: 5, y: 80 } });
  await input.fill('');
  await input.press('Enter');
  await expect(guide).toHaveCount(0);
  await expect(input).toHaveCount(0);

  await left.focus();
  await left.press('Enter');
  await input.fill('   ');
  await page.getByRole('heading', { name: 'State', exact: true }).click();
  await expect(guide).toHaveCount(0);
});

test('selecting an element and holding Option measures another without changing the selection', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?variant=paper-v1');
  const design = page.locator('[data-xuui-design]');
  const button = design.getByRole('button', { name: 'Save a seat' });
  const heading = design.getByRole('heading', { name: 'The art of noticing.' });
  const buttonBounds = (await button.boundingBox())!;
  const headingBounds = (await heading.boundingBox())!;
  await button.click();
  const selection = page.getByRole('status', { name: 'Selected element' });
  await expect(selection).toContainText('Selected button Save a seat');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  const gap =
    Math.round((buttonBounds.y - headingBounds.y - headingBounds.height) * 10) /
    10;
  await page.keyboard.down('Alt');
  await heading.hover();
  await expect(
    page.getByLabel(`Vertical distance ${gap} pixels`),
  ).toBeVisible();
  await heading.click();
  await expect(selection).toContainText('Selected button Save a seat');
  await expect(
    page.getByLabel(`Vertical distance ${gap} pixels`),
  ).toBeVisible();
  await page.screenshot({
    path: '.xuui-test/selection-measuring.png',
    fullPage: true,
  });
  await page.keyboard.up('Alt');
  await expect(page.locator('.measurement-line')).toHaveCount(0);
  await expect(selection).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(selection).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('guide dragging shows element bounds and snaps to their edges', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const component = (await page.locator('[data-xuui-design]').boundingBox())!;
  const ruler = (await page
    .getByRole('button', { name: /^Left ruler:/ })
    .boundingBox())!;
  await page.mouse.move(ruler.x + 5, ruler.y + 100);
  await page.mouse.down();
  await page.mouse.move(component.x + 2, component.y + 100, { steps: 8 });
  await expect(page.locator('[data-element-bound]').first()).toBeVisible();
  await expect(
    page.locator('[data-element-bound][data-snapped="true"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole('slider', { name: 'X guide', exact: true }),
  ).toHaveAttribute('aria-valuenow', '0');
  await page.screenshot({
    path: '.xuui-test/guides-snapping.png',
    fullPage: true,
  });
  await page.mouse.up();
  await expect(page.locator('[data-element-bound]')).toHaveCount(0);
});

test('the inspector keeps a long layer name to one line', async ({ page }) => {
  await page.goto('/?variant=paper-v1');
  await page
    .locator('[data-xuui-design]')
    .getByText('A slow walk. A fresh perspective.')
    .click();
  const name = page
    .getByRole('region', { name: 'Selected layer' })
    .getByRole('heading', { level: 2 });
  await expect(name).toHaveAttribute(
    'title',
    /^A slow walk\. A fresh perspective\./,
  );
  expect((await name.boundingBox())!.height).toBeLessThanOrEqual(20);
  expect(
    await name.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
});

test('the external right sidebar controls the design, copies parameters, and collapses', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?variant=paper-v1');
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  const canvas = page.getByRole('region', { name: 'Canvas' });
  await expect(sidebar).toBeVisible();
  await expect(sidebar.locator('[data-parameter-fill]').first()).toBeVisible();
  const sideBounds = (await sidebar.boundingBox())!;
  const canvasBounds = (await canvas.boundingBox())!;
  expect(sideBounds.x).toBeGreaterThanOrEqual(
    canvasBounds.x + canvasBounds.width,
  );
  expect(
    (await page
      .locator('[data-ruler-axis="x"][data-ruler-value="0"]')
      .boundingBox())!.y,
  ).toBeLessThan(canvasBounds.y);
  expect(
    (await page
      .locator('[data-ruler-axis="y"][data-ruler-value="0"]')
      .boundingBox())!.x,
  ).toBeLessThan(canvasBounds.x);
  await expect(
    page.getByRole('button', { name: /^(Right|Bottom) ruler:/ }),
  ).toHaveCount(0);
  await expect(page.locator('.component-surround')).toHaveCSS(
    'padding',
    '80px',
  );

  await sidebar.getByRole('switch', { name: 'Favourited?' }).check();
  await sidebar.getByRole('switch', { name: 'Logged in?' }).check();
  await expect(
    page
      .locator('[data-xuui-design]')
      .getByLabel('Favourited', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-xuui-design]')).toContainText(
    'WELCOME BACK',
  );
  await sidebar
    .getByRole('combobox', { name: 'Reservation', exact: true })
    .click();
  await page.getByRole('option', { name: 'Reserved', exact: true }).click();
  await expect(
    page
      .locator('[data-xuui-design]')
      .getByRole('button', { name: 'You’re on the list' }),
  ).toBeVisible();
  await sidebar.getByRole('button', { name: 'Edit Border radius' }).click();
  const radius = sidebar.getByRole('textbox', { name: 'Border radius value' });
  await radius.fill('24');
  await expect(page.locator('.sunday-card')).toHaveCSS('border-radius', '24px');
  await radius.press('Enter');
  await sidebar.getByRole('slider', { name: 'Font weight' }).press('End');
  await expect(page.locator('[data-xuui-design] h2')).toHaveCSS(
    'font-weight',
    '900',
  );
  await sidebar.getByRole('combobox', { name: 'Color', exact: true }).click();
  await page.getByRole('option', { name: '#435A7C', exact: true }).click();
  await expect(page.locator('[data-xuui-design] .reserve-button')).toHaveCSS(
    'background-color',
    'rgb(67, 90, 124)',
  );
  await sidebar.getByRole('button', { name: 'Copy parameters' }).click();
  const parameters = await page.evaluate(async () =>
    JSON.parse(await navigator.clipboard.readText()),
  );
  expect(parameters).toMatchObject({
    variantId: 'paper-v1',
    props: { borderRadius: 24, fontWeight: 900, color: '#435a7c' },
    state: { favourited: true, loggedIn: true },
    machine: { value: 'reserved' },
  });
  await page.screenshot({
    path: '.xuui-test/parameters-sidebar.png',
    fullPage: true,
  });

  await sidebar.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(sidebar).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(sidebar).toBeVisible();
  await page.keyboard.press('Control+Backslash');
  await expect(sidebar).toHaveCount(0);
  await page.keyboard.press('Control+Backslash');
  await expect(sidebar).toBeVisible();
});

test('Tab stays among sibling layers and the variant list updates the linked preview', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const selection = page.getByRole('status', { name: 'Selected element' });
  await page.keyboard.press('Tab');
  await expect(selection.locator('[data-selected-tag]')).toHaveAttribute(
    'data-selected-tag',
    'article',
  );
  await page.keyboard.press('Tab');
  await expect(selection.locator('[data-selected-tag]')).toHaveAttribute(
    'data-selected-tag',
    'article',
  );
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(selection).toContainText('Selected div A study in slowing down');
  await page.keyboard.press('Tab');
  await expect(selection).toContainText('Selected div FIELDNOTES');
  await page.keyboard.press('Shift+Tab');
  await expect(selection).toContainText('Selected div A study in slowing down');
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
    'MAIN',
  );
  await expect(page.locator('[data-xuui-design] h2')).toHaveCSS(
    'cursor',
    /cursors\/default\.svg/,
  );
  await page.getByRole('link', { name: 'After hours', exact: true }).click();
  await expect(page).toHaveURL(/variant=after-hours-v1/);
  await expect(
    page
      .locator('[data-xuui-design]')
      .getByRole('heading', { name: 'A little less rush.' }),
  ).toBeVisible();
  await expect(page.locator('[data-xuui-design] article')).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/variant=paper-v1/);
  await expect(
    page
      .locator('[data-xuui-design]')
      .getByRole('heading', { name: 'The art of noticing.' }),
  ).toBeVisible();
});

test('each variant restores its own guides when using the variant list', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const left = page.getByRole('button', { name: /^Left ruler:/ });
  await left.focus();
  await left.press('Enter');
  const position = page.getByRole('spinbutton', { name: 'X guide position' });
  await position.fill('72');
  await position.press('Enter');
  const guide = page.getByRole('slider', { name: 'X guide', exact: true });
  await expect(guide).toHaveAttribute('aria-valuenow', '72');
  await page
    .getByRole('navigation', { name: 'Variants' })
    .getByRole('link', { name: 'After hours', exact: true })
    .click();
  await expect(page).toHaveURL(/variant=after-hours-v1/);
  await expect(guide).toHaveCount(0);
  await left.focus();
  await left.press('Enter');
  await position.fill('-24');
  await position.press('Enter');
  await expect(guide).toHaveAttribute('aria-valuenow', '-24');
  await page
    .getByRole('navigation', { name: 'Variants' })
    .getByRole('link', { name: 'Paper', exact: true })
    .click();
  await expect(page).toHaveURL(/variant=paper-v1/);
  await expect(guide).toHaveAttribute('aria-valuenow', '72');
  await page
    .getByRole('navigation', { name: 'Variants' })
    .getByRole('link', { name: 'After hours', exact: true })
    .click();
  await expect(guide).toHaveAttribute('aria-valuenow', '-24');
  await page.reload();
  await expect(guide).toHaveAttribute('aria-valuenow', '-24');
});

test('each variant restores its own canvas position and zoom', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const scene = page.locator('[data-canvas-scene]');
  const variants = page.getByRole('navigation', { name: 'Variants' });
  const canvas = page.getByRole('main', { name: 'Variant canvas' });
  const centred = await scene.getAttribute('style');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(120, 80);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -40);
  await page.keyboard.up('Control');
  await expect(scene).not.toHaveAttribute('style', centred!);
  const moved = await scene.getAttribute('style');
  await variants
    .getByRole('link', { name: 'After hours', exact: true })
    .click();
  await expect(page).toHaveURL(/variant=after-hours-v1/);
  await expect(scene).not.toHaveAttribute('style', moved!);
  const other = await scene.getAttribute('style');
  await variants.getByRole('link', { name: 'Paper', exact: true }).click();
  await expect(page).toHaveURL(/variant=paper-v1/);
  await expect(scene).toHaveAttribute('style', moved!);
  await page.reload();
  await expect(scene).toHaveAttribute('style', moved!);
  await variants
    .getByRole('link', { name: 'After hours', exact: true })
    .click();
  await expect(scene).toHaveAttribute('style', other!);
});

test('all variants are side by side and the canvas pans without losing selection', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await page.getByRole('link', { name: 'All variants', exact: true }).click();
  await expect(page).toHaveURL(/view=all/);
  await expect(page.locator('[data-variant-id]')).toHaveCount(5);
  const cards = await page
    .locator('[data-variant-id]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().x),
    );
  expect(cards.every((x, index) => index === 0 || x > cards[index - 1])).toBe(
    true,
  );
  const paper = page.locator('[data-variant-id="paper-v1"] [data-xuui-design]');
  await paper.getByRole('heading', { name: 'The art of noticing.' }).click();
  const original = (await paper.boundingBox())!;
  await page.keyboard.down('Space');
  await page.mouse.move(original.x + 100, original.y + 120);
  await page.mouse.down();
  await page.mouse.move(original.x + 220, original.y + 160, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  await expect
    .poll(async () =>
      Math.abs((await paper.boundingBox())!.x - original.x - 120),
    )
    .toBeLessThan(1);
  await expect(
    page.getByRole('status', { name: 'Selected element' }),
  ).toContainText('Selected h2');
  await page.keyboard.press('Home');
  await expect
    .poll(async () => Math.abs((await paper.boundingBox())!.x - original.x))
    .toBeLessThan(1);
  await page.keyboard.press('Escape');
  await page.screenshot({
    path: '.xuui-test/all-variants.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Index', exact: true }).click();
  await expect(page).not.toHaveURL(/view=all/);
  await expect(page.locator('[data-xuui-design]')).toHaveCount(1);
});

test('Option without selection reveals layout spacing and the canvas edge resizes the sidebar', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await page.keyboard.down('Alt');
  await expect(
    page.getByRole('group', { name: 'Layout measurements' }),
  ).toBeVisible();
  await expect(page.locator('.measurement-line').first()).toBeVisible();
  await expect(page.locator('.measurement-label').first()).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  );
  await page.screenshot({
    path: '.xuui-test/layout-measurements.png',
    fullPage: true,
  });
  await page.keyboard.up('Alt');
  await expect(
    page.getByRole('group', { name: 'Layout measurements' }),
  ).toHaveCount(0);
  const canvas = page.getByRole('region', { name: 'Canvas' });
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width - 100,
    bounds.y + bounds.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeLessThan(bounds.width - 70);
  await expect(
    page.getByRole('separator', { name: 'Resize sidebar' }),
  ).toBeAttached();
  const resized = (await canvas.boundingBox())!;
  const zero = (await page
    .locator('[data-ruler-axis="x"][data-ruler-value="0"]')
    .boundingBox())!;
  const component = (await page.locator('[data-xuui-design]').boundingBox())!;
  expect(zero.x + zero.width / 2).toBeCloseTo(component.x);
  expect(resized.width).toBeGreaterThan(300);
});

test('R toggles rulers while retaining guides, selection, and the setting across variants', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const ruler = page.getByRole('button', { name: /^Left ruler:/ });
  await ruler.focus();
  await ruler.press('Enter');
  const input = page.getByRole('spinbutton', { name: 'X guide position' });
  await input.press('r');
  await expect(ruler).toBeVisible();
  await input.fill('24');
  await input.press('Enter');
  const guide = page.getByRole('slider', { name: 'X guide', exact: true });
  await page.keyboard.press('r');
  await expect(ruler).toHaveCount(0);
  await expect(page.locator('[data-ruler-axis]')).toHaveCount(0);
  await expect(guide).toHaveAttribute('aria-valuenow', '24');
  await page.locator('[data-xuui-design] h2').click();
  await expect(
    page.getByRole('status', { name: 'Selected element' }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Variants' })
    .getByRole('link', { name: 'After hours', exact: true })
    .click();
  await expect(ruler).toHaveCount(0);
  await page.keyboard.press('r');
  await expect(ruler).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Variants' })
    .getByRole('link', { name: 'Paper', exact: true })
    .click();
  await expect(guide).toHaveAttribute('aria-valuenow', '24');
});
