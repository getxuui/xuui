import { expect, test } from '@playwright/test';

test('wheel panning works over frame titles and their action icons', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const frame = page.locator('[data-variant-id="paper-v1"]');
  const name = frame
    .locator('[data-frame-title]')
    .getByRole('button', { name: 'Paper', exact: true });
  await name.hover();
  const before = (await frame.boundingBox())!.x;
  await page.mouse.wheel(120, 0);
  await expect
    .poll(async () => (await frame.boundingBox())!.x)
    .toBeCloseTo(before - 120, 0);
  const copy = frame.getByRole('button', {
    name: 'Copy link to Paper',
    exact: true,
  });
  await name.hover();
  await copy.hover();
  const next = (await frame.boundingBox())!.x;
  await page.mouse.wheel(-70, 0);
  await expect
    .poll(async () => (await frame.boundingBox())!.x)
    .toBeCloseTo(next + 70, 0);
});

test('wheel panning works over the toolbar and asides inside designs', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const frame = page.locator('[data-variant-id="paper-v1"]');
  const design = frame.locator('[data-xuui-design]');
  // Designs often use asides; they must not read as studio panels.
  await design.evaluate((element) => {
    const aside = document.createElement('aside');
    aside.textContent = 'Related reading';
    aside.style.cssText =
      'position:absolute;inset:0 auto auto 0;width:120px;height:80px';
    element.firstElementChild!.append(aside);
  });
  const panOver = async (target: ReturnType<typeof page.locator>) => {
    await target.hover();
    const before = (await frame.boundingBox())!.x;
    await page.mouse.wheel(90, 0);
    await expect
      .poll(async () => (await frame.boundingBox())!.x)
      .toBeCloseTo(before - 90, 0);
  };
  await panOver(design.locator('aside'));
  await panOver(
    page.getByRole('button', { name: 'Interact with preview', exact: true }),
  );
});

test('trackpad pinch anchors the canvas and keeps guides and measurements in component pixels', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const canvas = page.getByRole('region', { name: 'Canvas', exact: true });
  const design = page.locator('[data-xuui-design]');
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  const sidebarBefore = (await sidebar.boundingBox())!;
  const left = page.getByRole('button', { name: /^Left ruler:/ });
  await left.focus();
  await left.press('Enter');
  const input = page.getByRole('spinbutton', { name: 'X guide position' });
  await input.fill('72');
  await input.press('Enter');
  const heading = design.getByRole('heading', { name: 'The art of noticing.' });
  const button = design.getByRole('button', { name: 'Save a seat' });
  await heading.click();
  const label = page.locator('.selection-label');
  const originalSize = await label.textContent();
  const headingBefore = (await heading.boundingBox())!;
  const buttonBefore = (await button.boundingBox())!;
  const originalGap =
    Math.round((buttonBefore.y - headingBefore.y - headingBefore.height) * 10) /
    10;
  const before = (await design.boundingBox())!;
  const anchor = {
    x: before.x + before.width * 0.4,
    y: before.y + before.height * 0.6,
  };
  await page.mouse.move(anchor.x, anchor.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -Math.log(1.5) / 0.01);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => (await design.boundingBox())!.width / before.width)
    .toBeCloseTo(1.5, 2);
  const after = (await design.boundingBox())!;
  expect((anchor.x - after.x) / after.width).toBeCloseTo(0.4, 2);
  expect((anchor.y - after.y) / after.height).toBeCloseTo(0.6, 2);
  expect((await sidebar.boundingBox())!.width).toBeCloseTo(sidebarBefore.width);
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1);
  await expect(label).toHaveText(originalSize!);
  const guide = page.getByRole('slider', { name: 'X guide', exact: true });
  await expect(guide).toHaveAttribute('aria-valuenow', '72');
  await expect
    .poll(async () =>
      Math.abs(
        (await guide.locator('[data-guide-line]').boundingBox())!.x -
          after.x -
          72 * 1.5,
      ),
    )
    .toBeLessThan(1);
  const sixtyFour = (await page
    .locator('[data-ruler-axis="x"][data-ruler-value="64"]')
    .boundingBox())!;
  expect(sixtyFour.x + sixtyFour.width / 2).toBeCloseTo(after.x + 64 * 1.5, 0);
  await page.keyboard.down('Alt');
  await button.hover();
  await expect(
    page.getByLabel(`Vertical distance ${originalGap} pixels`),
  ).toBeVisible();
  await page.keyboard.up('Alt');
  await guide.click({ position: { x: 5, y: 80 } });
  await input.fill('123.5');
  await input.press('Enter');
  await expect
    .poll(async () =>
      Math.abs(
        (await guide.locator('[data-guide-line]').boundingBox())!.x -
          after.x -
          123.5 * 1.5,
      ),
    )
    .toBeLessThan(1);

  const canvasBounds = (await canvas.boundingBox())!;
  const ruler = (await left.boundingBox())!;
  await page.mouse.move(ruler.x + 5, ruler.y + 80);
  await page.mouse.down();
  await page.mouse.move(after.x + 2, canvasBounds.y + 120, { steps: 6 });
  await expect(
    page
      .getByRole('slider', { name: 'X guide', exact: true })
      .filter({ has: page.locator('[data-guide-line]') })
      .first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-element-bound][data-snapped="true"]'),
  ).toHaveCount(1);
  await page.mouse.up();
  await expect(
    page.getByRole('slider', { name: 'X guide', exact: true }).last(),
  ).toHaveAttribute('aria-valuenow', '0');
  await page.screenshot({ path: '.xuui-test/canvas-zoom.png', fullPage: true });
});

test('Enter selects a group’s children and Shift+Enter returns to the parent', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const selection = page.getByRole('status', { name: 'Selected element' });
  await page.keyboard.press('Tab');
  await expect(selection.locator('[data-selected-tag]')).toHaveAttribute(
    'data-selected-tag',
    'article',
  );
  await page.keyboard.press('Enter');
  await expect(selection).toHaveAttribute('data-selection-count', '2');
  await expect(selection.locator('.selection-outline')).toHaveCount(2);
  await expect(selection).toContainText('Selected 2 layers');
  await page.keyboard.press('Shift+Enter');
  await expect(selection).toHaveAttribute('data-selection-count', '1');
  await expect(selection.locator('[data-selected-tag]')).toHaveAttribute(
    'data-selected-tag',
    'article',
  );
  await page.keyboard.press('Shift+Enter');
  await expect(selection.locator('[data-selected-tag]')).toHaveAttribute(
    'data-selected-tag',
    'article',
  );

  await page.locator('[data-xuui-design] h2').click();
  await page.keyboard.press('Shift+Enter');
  await expect(selection.locator('[data-selected-tag]')).toHaveAttribute(
    'data-selected-tag',
    'div',
  );
  await page.keyboard.press('Enter');
  await expect(selection).toHaveAttribute('data-selection-count', '5');
  await expect(selection.locator('.selection-outline')).toHaveCount(5);
  await page.keyboard.press('Tab');
  await expect(selection).toHaveAttribute('data-selection-count', '1');
  await page.keyboard.press('Escape');
  await expect(selection).toHaveCount(0);
});

test('the bottom-center zoom widget and Command+0 restore 100% without clearing selection', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const canvas = page.getByRole('region', { name: 'Canvas', exact: true });
  const design = page.locator('[data-xuui-design]');
  const reset = page.getByRole('button', {
    name: 'Reset zoom to 100%',
    exact: true,
  });
  await expect(reset).toHaveCount(0);
  const area = (await canvas.boundingBox())!;
  await design.getByRole('heading', { name: 'The art of noticing.' }).click();
  const original = (await design.boundingBox())!;
  const pinch = async () => {
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -Math.log(1.5) / 0.01);
    await page.keyboard.up('Control');
    await expect(reset).toHaveText('150%');
  };
  await pinch();
  const widget = (await reset.boundingBox())!;
  expect(widget.x + widget.width / 2).toBeCloseTo(area.x + area.width / 2);
  const tools = (await page
    .getByRole('group', { name: 'Canvas mode', exact: true })
    .boundingBox())!;
  expect(tools.y).toBeGreaterThan(area.y + area.height - 60);
  expect(widget.y + widget.height).toBeLessThanOrEqual(tools.y - 8);
  await reset.click();
  await expect(reset).toHaveText('100%');
  await expect
    .poll(async () => (await design.boundingBox())!.width)
    .toBeCloseTo(original.width);
  await expect(
    page.getByRole('status', { name: 'Selected element' }),
  ).toContainText('Selected h2');
  await pinch();
  await page
    .getByRole('button', { name: 'Copy layer properties', exact: true })
    .focus();
  await page.keyboard.press('Meta+0');
  await expect(reset).toHaveText('100%');
  await expect
    .poll(async () => (await design.boundingBox())!.width)
    .toBeCloseTo(original.width);
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1);
  await page.screenshot({
    path: '.xuui-test/zoom-reset-widget.png',
    fullPage: true,
  });
  await expect(reset).toHaveCount(0);
  await page.mouse.wheel(0, 20);
  await expect(reset).toHaveCount(0);
});

test('Safari gesture events zoom the canvas and respect the zoom limits', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const design = page.locator('[data-xuui-design]');
  const before = (await design.boundingBox())!;
  const anchor = {
    x: before.x + before.width / 2,
    y: before.y + before.height / 2,
  };
  const gesture = async (type: string, scale: number) =>
    page.getByRole('region', { name: 'Canvas', exact: true }).evaluate(
      (element, detail) => {
        const event = new Event(detail.type, {
          bubbles: true,
          cancelable: true,
        });
        Object.assign(event, {
          scale: detail.scale,
          clientX: detail.x,
          clientY: detail.y,
        });
        element.dispatchEvent(event);
      },
      { type, scale, ...anchor },
    );
  await gesture('gesturestart', 1);
  await gesture('gesturechange', 1.6);
  await expect
    .poll(async () => (await design.boundingBox())!.width / before.width)
    .toBeCloseTo(1.6, 2);
  await gesture('gesturechange', 100);
  await expect
    .poll(async () => (await design.boundingBox())!.width / before.width)
    .toBeCloseTo(8, 2);
  await gesture('gesturechange', 0.001);
  await expect
    .poll(async () => (await design.boundingBox())!.width / before.width)
    .toBeCloseTo(0.02, 2);
  await gesture('gestureend', 0.001);
});

test.describe('touchscreen canvas', () => {
  test.use({ hasTouch: true });
  test('two-finger pinch zooms without scaling the page or losing selection', async ({
    page,
    context,
  }) => {
    await page.goto('/?variant=paper-v1');
    const design = page.locator('[data-xuui-design]');
    await design.getByRole('heading', { name: 'The art of noticing.' }).click();
    const before = (await design.boundingBox())!;
    const anchor = {
      x: before.x + before.width / 2,
      y: before.y + before.height / 2,
    };
    const session = await context.newCDPSession(page);
    const fingers = (spread: number) => [
      { id: 1, x: anchor.x - spread, y: anchor.y },
      { id: 2, x: anchor.x + spread, y: anchor.y },
    ];
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: fingers(50),
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: fingers(80),
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect
      .poll(async () => (await design.boundingBox())!.width / before.width)
      .toBeCloseTo(1.6, 1);
    expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1);
    await expect(
      page.getByRole('status', { name: 'Selected element' }),
    ).toContainText('Selected h2');
    await expect(
      page.getByRole('region', { name: 'Canvas', exact: true }),
    ).not.toHaveAttribute('data-pan-mode', 'true');
    await session.detach();
  });
});

test('Tab cycles only the current group’s siblings, even when siblings contain children', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const tree = page.getByRole('tree', { name: 'Component layers' });
  const selected = tree.getByRole('treeitem', { selected: true });
  const canvas = page.getByRole('main', { name: 'Variant canvas' });
  await page.locator('[data-xuui-design] h2').click();
  await page.keyboard.press('Tab');
  await expect(selected).toHaveAttribute(
    'aria-label',
    'A slow walk. A fresh perspective.A little room for the everyday.',
  );
  await page.keyboard.press('Tab');
  await expect(selected).toHaveAttribute('aria-label', 'Event details');
  await page.keyboard.press('Tab');
  await expect(selected).toHaveAttribute('aria-label', 'Card actions');
  await page.keyboard.press('Tab');
  await expect(selected).toHaveAttribute('aria-label', 'Card eyebrow');
  await page.keyboard.press('Shift+Tab');
  await expect(selected).toHaveAttribute('aria-label', 'Card actions');
  await expect(canvas).toBeFocused();
  await page.keyboard.press('Shift+Enter');
  await expect(selected).toHaveAttribute('aria-label', 'Card content');
  await page.keyboard.press('Tab');
  await expect(selected).toHaveAttribute('aria-label', 'Leaf study');
  await page.keyboard.press('Tab');
  await expect(selected).toHaveAttribute('aria-label', 'Card content');
  await page.keyboard.press('Enter');
  await expect(selected).toHaveCount(5);
  await page.keyboard.press('Tab');
  await expect(selected).toHaveCount(1);
  await expect(selected).toHaveAttribute('aria-label', 'Card eyebrow');
});

test('comment mode uses the matching cursor in each theme and Space temporarily restores panning', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('xuui-theme', 'dark'));
  await page.goto('/?variant=paper-v1');
  const heading = page.locator('[data-xuui-design] h2');
  await expect(heading).toHaveCSS('cursor', /cursors\/default\.svg/);
  await page.getByRole('button', { name: 'Comment mode', exact: true }).click();
  await expect(heading).toHaveCSS('cursor', /cursors\/comment-dark\.svg/);
  await page.keyboard.press('d');
  await expect(heading).toHaveCSS('cursor', /cursors\/comment\.svg/);
  await page.getByRole('main', { name: 'Variant canvas', exact: true }).focus();
  await page.keyboard.down('Space');
  await expect(heading).toHaveCSS('cursor', 'grab');
  await page.keyboard.up('Space');
  await expect(heading).toHaveCSS('cursor', /cursors\/comment\.svg/);
  await page
    .getByRole('button', { name: 'Select layers', exact: true })
    .click();
  await expect(heading).toHaveCSS('cursor', /cursors\/default\.svg/);
});

test('zoom shortcuts fit all variants or the selection and return to 100%', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1&view=all');
  const canvas = page.getByRole('main', { name: 'Variant canvas' });
  const scene = page.locator('[data-canvas-scene]');
  const inside = async (selector: string) => {
    const area = (await canvas.boundingBox())!;
    const boxes = await page
      .locator(selector)
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().toJSON()),
      );
    return boxes.every(
      (box) =>
        box.left >= area.x - 1 &&
        box.top >= area.y - 1 &&
        box.right <= area.x + area.width + 1 &&
        box.bottom <= area.y + area.height + 1,
    );
  };
  // With no selection in All view, Shift+2 fits all variants.
  await page.keyboard.press('Shift+2');
  await expect.poll(() => inside('[data-variant-id]')).toBe(true);

  await page.keyboard.press('Shift+1');
  await expect.poll(() => inside('[data-variant-id]')).toBe(true);

  const heading = page
    .locator('[data-variant-id="paper-v1"] [data-xuui-design] h2')
    .first();
  await heading.click();
  await page.keyboard.press('Shift+2');
  const area = (await canvas.boundingBox())!;
  await expect
    .poll(async () => {
      const box = (await heading.boundingBox())!;
      const fills = Math.max(
        box.width / (area.width - 96),
        box.height / (area.height - 96),
      );
      const centred =
        Math.abs(box.x + box.width / 2 - (area.x + area.width / 2)) < 2;
      return fills > 0.98 && centred;
    })
    .toBe(true);

  await page.keyboard.press('Shift+0');
  await expect(scene).toHaveAttribute('data-canvas-scale', '1');
});

test('zoom shortcuts work after selecting from the sidebar, and Shift+2 falls back to the variant', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const canvas = page.getByRole('main', { name: 'Variant canvas' });
  const scene = page.locator('[data-canvas-scene]');

  // Nothing selected: Shift+2 fits the active variant.
  await page.keyboard.press('Shift+2');
  await expect(scene).not.toHaveAttribute('data-canvas-scale', '1');
  await page.keyboard.press('Shift+0');
  await expect(scene).toHaveAttribute('data-canvas-scale', '1');

  // Selecting in Layers leaves focus in the sidebar; Shift+2 still zooms.
  const layers = page.getByRole('complementary', {
    name: 'Layers',
    exact: true,
  });
  await layers
    .getByRole('treeitem', { name: 'Paper', exact: true })
    .locator(':scope > .layer-tree-row')
    .click();
  await expect(page.locator(':focus')).toBeAttached();
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest('aside')),
    ),
  ).toBe(true);
  await page.keyboard.press('Shift+2');
  const area = (await canvas.boundingBox())!;
  const design = page.locator(
    '[data-variant-id="paper-v1"] [data-xuui-design]',
  );
  await expect
    .poll(async () => {
      const box = (await design.boundingBox())!;
      return Math.abs(box.x + box.width / 2 - (area.x + area.width / 2)) < 2;
    })
    .toBe(true);
  await expect(scene).not.toHaveAttribute('data-canvas-scale', '1');
});

test('the toolbar separator is centred with the tools beside it', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const middles = await page
    .getByRole('group', { name: 'Canvas mode' })
    .locator('..')
    .evaluate((toolbar) =>
      [...toolbar.children].map((child) => {
        const box = child.getBoundingClientRect();
        return Math.round(box.top + box.height / 2);
      }),
    );
  expect(new Set(middles).size).toBe(1);
});

test('in Play mode a scrollable area in the design scrolls, then the canvas pans', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const frame = page.locator('[data-variant-id="paper-v1"]');
  const design = frame.locator('[data-xuui-design]');
  await design.evaluate((element) => {
    const list = document.createElement('div');
    list.dataset.testScroller = '';
    list.style.cssText =
      'position:absolute;inset:0 auto auto 0;width:160px;height:80px;overflow-y:auto';
    list.innerHTML = '<div style="height:400px">Long list</div>';
    element.firstElementChild!.append(list);
  });
  const list = design.locator('[data-test-scroller]');
  const scrollTop = () => list.evaluate((element) => element.scrollTop);
  await list.hover();
  // Outside Play mode the wheel pans, even over a scrollable area.
  let before = (await frame.boundingBox())!.y;
  await page.mouse.wheel(0, 60);
  await expect
    .poll(async () => (await frame.boundingBox())!.y)
    .toBeCloseTo(before - 60, 0);
  expect(await scrollTop()).toBe(0);
  await page
    .getByRole('button', { name: 'Interact with preview', exact: true })
    .click();
  await list.hover();
  before = (await frame.boundingBox())!.y;
  await page.mouse.wheel(0, 100);
  await expect.poll(scrollTop).toBeGreaterThan(0);
  expect((await frame.boundingBox())!.y).toBeCloseTo(before, 0);
  // At its end the list hands the wheel back to the canvas.
  await list.evaluate((element) => (element.scrollTop = element.scrollHeight));
  await page.mouse.wheel(0, 50);
  await expect
    .poll(async () => (await frame.boundingBox())!.y)
    .toBeCloseTo(before - 50, 0);
});
