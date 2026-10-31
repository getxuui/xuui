import { expect, test } from '@playwright/test';

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
  expect(sixtyFour.x + sixtyFour.width / 2).toBeCloseTo(after.x + 64 * 1.5);
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
  expect(widget.y).toBeGreaterThan(area.y + area.height - 60);
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
    .getByRole('combobox', { name: 'Reservation', exact: true })
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
    .toBeCloseTo(0.1, 2);
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
