import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const row = (item: Locator) => item.locator(':scope > .layer-tree-row');

// Reopening Layers lays the panels out against the old group height for a
// frame, so the divider flickers before it settles. Measure it only once it
// has held still for several frames; a drag from a stale point misses it.
async function settledBox(locator: Locator) {
  await locator.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        let last = '';
        let steady = 0;
        const check = () => {
          const { y, height } = element.getBoundingClientRect();
          const current = `${y},${height}`;
          steady = current === last ? steady + 1 : 0;
          last = current;
          if (steady >= 5) resolve();
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
  );
  return (await locator.boundingBox())!;
}

test('the Layers section fully collapses and reopens by control, drag, and shortcut', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const layers = page.getByRole('complementary', {
    name: 'Layers',
    exact: true,
  });
  const tree = layers.getByRole('tree', { name: 'Component layers' });
  const root = tree.getByRole('treeitem', { name: 'Paper', exact: true });
  await row(root).click();
  const pages = layers.getByRole('region', { name: 'Pages', exact: true });
  const before = (await pages.boundingBox())!.height;
  const collapse = layers.getByRole('button', {
    name: 'Collapse layer panel',
    exact: true,
  });
  await collapse.focus();
  await collapse.press('Enter');
  await expect(tree).toHaveCount(0);
  // Collapsed, the panel keeps exactly the height of its reopen bar.
  await expect(page.locator('#layer-tree')).toHaveCSS('height', '40px');
  const expand = layers.getByRole('button', {
    name: 'Expand layer panel',
    exact: true,
  });
  await expect(expand).toBeFocused();
  await expect(
    pages.getByRole('combobox', { name: 'Study', exact: true }),
  ).toBeVisible();
  expect((await pages.boundingBox())!.height).toBeGreaterThan(before);
  // Reopening must not flicker: the divider takes one new position and keeps
  // it, frame after frame.
  const positions = await expand.evaluate(async (button) => {
    const divider = document.querySelector(
      '[aria-label="Resize pages and layers"]',
    )!;
    (button as HTMLButtonElement).click();
    const seen: number[] = [];
    for (let frame = 0; frame < 12; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      seen.push(Math.round(divider.getBoundingClientRect().y));
    }
    return seen;
  });
  expect(new Set(positions).size).toBe(1);
  await layers
    .getByRole('button', { name: 'Collapse layer panel', exact: true })
    .click();
  await expect(expand).toBeVisible();
  await expand.focus();
  await expand.press('Enter');
  await expect(root).toBeFocused();
  await expect(root).toHaveAttribute('aria-selected', 'true');
  const handle = layers.getByRole('separator', {
    name: 'Resize pages and layers',
    exact: true,
  });
  const divider = await settledBox(handle);
  const bounds = (await layers.boundingBox())!;
  await page.mouse.move(
    divider.x + divider.width / 2,
    divider.y + divider.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    divider.x + divider.width / 2,
    bounds.y + bounds.height - 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect(tree).toHaveCount(0);
  await expect(expand).toBeVisible();
  await page.keyboard.press('l');
  await expect(root).toBeFocused();
});

test('pages and layers resize vertically while navigation stays usable', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const pages = page.getByRole('region', { name: 'Pages', exact: true });
  const handle = page.getByRole('separator', {
    name: 'Resize pages and layers',
    exact: true,
  });
  const before = (await pages.boundingBox())!;
  const divider = (await handle.boundingBox())!;
  await page.mouse.move(
    divider.x + divider.width / 2,
    divider.y + divider.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(divider.x + divider.width / 2, divider.y + 100, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(async () => (await pages.boundingBox())!.height)
    .toBeGreaterThan(before.height + 90);
  const afterDrag = (await pages.boundingBox())!.height;
  await handle.focus();
  await handle.press('ArrowUp');
  await expect
    .poll(async () => (await pages.boundingBox())!.height)
    .toBeLessThan(afterDrag);
  await page
    .getByRole('navigation', { name: 'Variants' })
    .getByRole('link', { name: 'After hours', exact: true })
    .click();
  await expect(
    page.getByRole('treeitem', { name: 'After hours', exact: true }),
  ).toBeVisible();
});

test('the layer tree mirrors canvas selection and supports hierarchical keyboard navigation', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'light'));
  await page.goto('/?variant=paper-v1');
  const layers = page.getByRole('complementary', {
    name: 'Layers',
    exact: true,
  });
  const tree = layers.getByRole('tree', { name: 'Component layers' });
  const root = tree.getByRole('treeitem', { name: 'Paper', exact: true });
  const canvas = page.getByRole('region', { name: 'Canvas', exact: true });
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  const area = (await canvas.boundingBox())!;
  const left = (await layers.boundingBox())!;
  const right = (await sidebar.boundingBox())!;
  expect(left.x + left.width).toBeLessThanOrEqual(area.x + 1);
  expect(right.x).toBeGreaterThanOrEqual(area.x + area.width - 1);
  await expect(
    layers.getByRole('heading', { name: 'xuui', exact: true }),
  ).toBeVisible();
  await expect(
    layers.getByRole('combobox', { name: 'Study', exact: true }),
  ).toBeVisible();
  await expect(
    layers.getByRole('navigation', { name: 'Variants', exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole('combobox', { name: 'Study', exact: true }),
  ).toHaveCount(0);
  await row(root).click();
  for (const name of ['State', 'Props', 'Comments'])
    await expect(
      sidebar.getByRole('region', { name, exact: true }),
    ).toHaveCount(0);
  await expect(root).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-selected-tag="article"]')).toHaveCount(1);
  await root.press('ArrowLeft');
  await expect(root).toHaveAttribute('aria-expanded', 'false');
  await expect(tree.getByRole('treeitem')).toHaveCount(1);
  await root.press('ArrowRight');
  await root.press('ArrowRight');
  const art = tree.getByRole('treeitem', { name: 'Leaf study', exact: true });
  await expect(art).toBeFocused();
  await expect(art).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(
    tree.getByRole('treeitem', { name: 'Sun disc', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(art).toBeFocused();
  await expect(page).toHaveURL(/variant=paper-v1$/);
  await page.keyboard.press('Tab');
  await expect(
    tree.getByRole('treeitem', { name: 'Card content', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(art).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(canvas.getByRole('main')).toBeFocused();
  await page.locator('[data-xuui-design] h2').click();
  await expect(tree.getByRole('treeitem', { selected: true })).toHaveAttribute(
    'aria-label',
    'The art of noticing.',
  );
  await expect(
    sidebar.getByRole('region', { name: 'Selected layer', exact: true }),
  ).toContainText('Position & size');
  await page.keyboard.press('Shift+Enter');
  await expect(tree.getByRole('treeitem', { selected: true })).toHaveAttribute(
    'aria-label',
    'Card content',
  );
  await page.keyboard.press('Enter');
  await expect(tree.getByRole('treeitem', { selected: true })).toHaveCount(5);
  await page.locator('[data-xuui-design] h2').click();
  await page.screenshot({
    path: '.xuui-test/layers-light.png',
    animations: 'disabled',
  });
  await page.keyboard.press('d');
  await page.screenshot({
    path: '.xuui-test/layers-dark.png',
    animations: 'disabled',
  });
});

test('the tree has no search field and follows live layer names and rendered children', async ({
  page,
}) => {
  await page.goto('/?study=reading-room&variant=reading-cover-v1');
  const layers = page.getByRole('complementary', {
    name: 'Layers',
    exact: true,
  });
  const tree = layers.getByRole('tree');
  await expect(layers.getByRole('searchbox')).toHaveCount(0);
  await page.locator('.reading-info h2').click();
  await tree
    .getByRole('button', { name: 'Expand Reading art', exact: true })
    .click();
  await tree
    .getByRole('button', { name: 'Expand Reading book', exact: true })
    .click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('A very long new title for the reading room');
  await expect(
    tree.getByRole('treeitem', {
      name: 'A very long new title for the reading room',
      exact: true,
    }),
  ).toHaveCount(2);
  await expect(
    tree.locator('[data-marquee][data-overflow="true"]').first(),
  ).toBeVisible();
  await expect(tree.locator('[title]')).toHaveCount(0);
  const titleInput = page.getByRole('textbox', { name: 'Title', exact: true });
  await titleInput.press('l');
  await expect(titleInput).toBeFocused();
  await page
    .getByRole('button', { name: 'Interact with preview', exact: true })
    .click();
  await page.locator('[data-xuui-design] .reading-excerpt-toggle').click();
  const excerpt = tree.getByRole('treeitem', { name: /Start with the path/ });
  await expect(excerpt).toHaveCount(1);
  await row(excerpt).click();
  await expect(
    page.getByRole('region', { name: 'Selected layer', exact: true }),
  ).toContainText('Start with the path');
  await expect(page.locator('[data-canvas-mode]')).toHaveAttribute(
    'data-canvas-mode',
    'select',
  );
});

test('All variants has separate layer roots and selecting one activates its inspector', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1&view=all');
  const tree = page.getByRole('tree');
  const afterHours = tree.getByRole('treeitem', {
    name: 'After hours',
    exact: true,
  });
  await row(afterHours).click();
  await expect(page).toHaveURL(/variant=after-hours-v1&view=all$/);
  await expect(afterHours).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('region', { name: 'Selected layer', exact: true }),
  ).toContainText('After hours');
  await expect(page.locator('[data-variant-id]')).toHaveCount(5);
  await page.getByRole('link', { name: 'After hours', exact: true }).click();
  await expect(tree.locator(':scope > [role="treeitem"]')).toHaveCount(1);
  await expect(
    tree.getByRole('treeitem', { name: 'After hours', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Collapse layers', exact: true })
    .click();
  await expect(
    page.getByRole('complementary', { name: 'Layers', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Expand layers', exact: true })
    .click();
  await expect(tree).toBeVisible();
});

test('compact screens open the layer tree in a dismissible left sheet', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/?study=reading-room&variant=reading-cover-v1');
  await expect(
    page.getByRole('complementary', { name: 'Layers', exact: true }),
  ).toHaveCount(0);
  const trigger = page.getByRole('button', {
    name: 'Expand layers',
    exact: true,
  });
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Layers', exact: true });
  await expect(sheet).toBeVisible();
  const root = sheet.getByRole('treeitem', { name: 'Cover', exact: true });
  await row(root).click();
  await expect(root).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({
    path: '.xuui-test/layers-compact.png',
    animations: 'disabled',
  });
  await sheet
    .getByRole('button', { name: 'Collapse layers', exact: true })
    .click();
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press('l');
  await expect(root).toBeFocused();
  await root.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(
    page.getByRole('main', { name: 'Variant canvas' }),
  ).toBeFocused();
  await expect(
    page.getByRole('region', { name: 'Selected layer', exact: true }),
  ).toContainText('Cover');
  await page.keyboard.press('l');
  await expect(root).toBeFocused();
  await root.press('Tab');
  await expect(root).toBeFocused();
  await expect(sheet).toBeVisible();
  await root.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(
    page.getByRole('main', { name: 'Variant canvas' }),
  ).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

test('Enter descends and Shift+Enter ascends when focus is in Layers', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const tree = page.getByRole('tree', { name: 'Component layers' });
  const heading = tree.getByRole('treeitem', {
    name: 'The art of noticing.',
    exact: true,
  });
  const content = tree.getByRole('treeitem', {
    name: 'Card content',
    exact: true,
  });
  const root = tree.getByRole('treeitem', { name: 'Paper', exact: true });
  await page.locator('[data-xuui-design] h2').click();
  await page.keyboard.press('l');
  await expect(heading).toBeFocused();
  await page.keyboard.press('Shift+Enter');
  await expect(content).toHaveAttribute('aria-selected', 'true');
  await expect(content).toBeFocused();
  await page.keyboard.press('Shift+Enter');
  await expect(root).toHaveAttribute('aria-selected', 'true');
  await expect(root).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('region', { name: 'Selected layers', exact: true }),
  ).toContainText('2 layers');
  await page.keyboard.press('Shift+Enter');
  await expect(root).toHaveAttribute('aria-selected', 'true');
  await expect(root).toBeFocused();
});

test('L focuses the selected layer, Tab cycles siblings, and Escape returns to the canvas', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'light'));
  await page.goto('/?variant=paper-v1');
  const canvas = page.getByRole('main', { name: 'Variant canvas' });
  const tree = page.getByRole('tree', { name: 'Component layers' });
  const heading = tree.getByRole('treeitem', {
    name: 'The art of noticing.',
    exact: true,
  });
  await page.locator('[data-xuui-design] h2').click();
  await page.keyboard.press('l');
  await expect(heading).toBeFocused();
  const layers = page.getByRole('complementary', {
    name: 'Layers',
    exact: true,
  });
  await page.screenshot({
    path: '.xuui-test/layer-keyboard-light.png',
    animations: 'disabled',
  });
  await page.keyboard.press('ArrowLeft');
  const group = tree.getByRole('treeitem', {
    name: 'Card content',
    exact: true,
  });
  await expect(group).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(canvas).toBeFocused();
  await expect(group).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('l');
  await expect(group).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    tree.getByRole('treeitem', { name: 'Leaf study', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(group).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(canvas).toBeFocused();
  await layers
    .getByRole('button', { name: 'Collapse layers', exact: true })
    .click();
  await page.keyboard.press('l');
  await expect(group).toBeFocused();
  await page.keyboard.press('l');
  await expect(canvas).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/variant=after-hours-v1$/);
  await page.keyboard.press('l');
  await expect(
    tree.getByRole('treeitem', { name: 'After hours', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('d');
  await page.screenshot({
    path: '.xuui-test/layer-keyboard-dark.png',
    animations: 'disabled',
  });
});
