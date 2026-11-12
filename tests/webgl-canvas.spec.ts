import { expect, test } from '@playwright/test';

test.use({ deviceScaleFactor: 2 });

test('one WebGL surface paints grids, links and selection and follows layout, camera and theme', async ({
  page,
}) => {
  // Read the drawing buffer immediately after submission, before the browser
  // discards it for compositing. This checks real GPU output, not DOM markers.
  await page.addInitScript(() => {
    const probe = {
      draws: 0,
      painted: 0,
      error: 0,
      width: 0,
      height: 0,
      red: 0,
    };
    Object.defineProperty(window, 'webglProbe', { value: probe });
    const original = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function (...args) {
      original.apply(this, args);
      if (
        !(this.canvas instanceof HTMLCanvasElement) ||
        !this.canvas.hasAttribute('data-webgl-canvas')
      )
        return;
      const pixels = new Uint8Array(
        this.drawingBufferWidth * this.drawingBufferHeight * 4,
      );
      this.readPixels(
        0,
        0,
        this.drawingBufferWidth,
        this.drawingBufferHeight,
        this.RGBA,
        this.UNSIGNED_BYTE,
        pixels,
      );
      probe.draws++;
      probe.painted = 0;
      probe.red = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3]) {
          probe.painted++;
          probe.red += pixels[index];
        }
      }
      probe.width = this.drawingBufferWidth;
      probe.height = this.drawingBufferHeight;
      probe.error = this.getError();
    };
  });
  await page.goto('/?study=grid-study&variant=grid-authored-v1');
  const root = page.getByRole('region', { name: 'Canvas', exact: true });
  const surface = root.locator('[data-webgl-canvas]');
  await expect(root).toHaveAttribute('data-canvas-renderer', 'webgl');
  await expect(surface).toHaveCount(1);
  const probe = () =>
    page.evaluate(
      () =>
        Reflect.get(window, 'webglProbe') as {
          draws: number;
          painted: number;
          error: number;
          width: number;
          height: number;
          red: number;
        },
    );
  await expect.poll(async () => (await probe()).painted).toBeGreaterThan(10000);
  const bounds = (await surface.boundingBox())!;
  const initial = await probe();
  expect(initial.width).toBe(Math.round(bounds.width * 2));
  expect(initial.height).toBe(Math.round(bounds.height * 2));
  expect(initial.error).toBe(0);
  // The GPU surface stays viewport-sized as artboards zoom.
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -Math.log(1.5) / 0.01);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => (await probe()).painted)
    .toBeGreaterThan(initial.painted);
  expect((await probe()).width).toBe(initial.width);
  const darkRed = (await probe()).red;
  await page.keyboard.press('d');
  await expect.poll(async () => (await probe()).red).not.toBe(darkRed);
  // Offscreen geometry clears from the GPU while the scene remains live.
  await page.mouse.wheel(10000, 0);
  await expect.poll(async () => (await probe()).painted).toBe(0);
  await page.keyboard.press('Shift+1');
  await expect.poll(async () => (await probe()).painted).toBeGreaterThan(0);
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect.poll(async () => (await probe()).width).not.toBe(initial.width);
  expect((await probe()).error).toBe(0);
  await page.screenshot({ path: '.xuui-test/webgl-canvas.png' });

  // With neither grids nor selection, these pixels can only be the wires.
  await page.goto(
    '/?study=ticket-history&variant=history-botanical-v1&view=all',
  );
  await page.keyboard.press('Shift+1');
  await expect(root).toHaveAttribute('data-canvas-renderer', 'webgl');
  await expect(root.locator('[data-lineage-line]')).toHaveCount(2);
  await expect.poll(async () => (await probe()).painted).toBeGreaterThan(50);
  expect((await probe()).error).toBe(0);

  // A selected layer also paints through WebGL with no other geometry present.
  await page.goto('/?variant=paper-v1');
  await root.locator('[data-xuui-design] h2').click();
  await expect(root).toHaveAttribute('data-canvas-renderer', 'webgl');
  await expect.poll(async () => (await probe()).painted).toBeGreaterThan(200);
  expect((await probe()).error).toBe(0);
});

test('context loss restores the DOM graphics and recovery resumes WebGL without losing selection', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  const root = page.getByRole('region', { name: 'Canvas', exact: true });
  const surface = root.locator('canvas[data-webgl-canvas]');
  await expect(root).toHaveAttribute('data-canvas-renderer', 'webgl');
  await root.locator('[data-xuui-design] h2').click();
  const outline = root.locator('.selection-outline');
  await expect(outline).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  const supported = await surface.evaluate((canvas: HTMLCanvasElement) => {
    const extension = canvas
      .getContext('webgl')!
      .getExtension('WEBGL_lose_context');
    Object.defineProperty(window, 'lostContextExtension', { value: extension });
    extension?.loseContext();
    return Boolean(extension);
  });
  expect(supported).toBe(true);
  await expect(root).toHaveAttribute('data-canvas-renderer', 'dom');
  await expect(outline).not.toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  await page.evaluate(() =>
    Reflect.get(window, 'lostContextExtension').restoreContext(),
  );
  await expect(root).toHaveAttribute('data-canvas-renderer', 'webgl');
  await expect(outline).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  await expect(
    page.getByRole('status', { name: 'Selected element' }),
  ).toContainText('The art of noticing.');
});

test('a browser without WebGL keeps grids, selection and Play mode usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (
        this: HTMLCanvasElement,
        kind: string,
        options: unknown,
      ) {
        if (kind === 'webgl') return null;
        return original.call(this, kind, options);
      },
    });
  });
  await page.goto('/?study=grid-study&variant=grid-authored-v1');
  const root = page.getByRole('region', { name: 'Canvas', exact: true });
  await expect(root).toHaveAttribute('data-canvas-renderer', 'dom');
  await expect(root.locator('[data-grid-overlays]')).toHaveCSS('opacity', '1');
  await root.locator('[data-xuui-design] h2').click();
  await expect(root.locator('.selection-outline')).not.toHaveCSS(
    'border-top-color',
    'rgba(0, 0, 0, 0)',
  );
  await page
    .getByRole('button', { name: 'Interact with preview', exact: true })
    .click();
  await expect(root).toHaveAttribute('data-canvas-mode', 'interact');
});
