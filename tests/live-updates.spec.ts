import { expect, test as base } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

type Workspace = {
  url: string;
  register: (ready?: boolean, extraStudy?: boolean) => Promise<void>;
  report: (
    status: 'working' | 'done',
    overrides?: Record<string, unknown>,
  ) => Promise<void>;
};

const test = base.extend<{ workspace: Workspace }>({
  workspace: async ({}, use) => {
    const root = await mkdtemp(resolve('.xuui-test/updates-'));
    await writeFile(
      resolve(root, 'Design.tsx'),
      `import { useState } from 'react';
export function Design({ state, props, machine }) {
  const [count, setCount] = useState(0);
  return <article style={{ width: 320, height: 240, padding: 24, background: 'white', color: 'black', borderRadius: props.radius }}>
    <h2>Keep my place</h2><p>{state.favourited ? 'Favourited' : 'Ordinary'}</p>
    <button onClick={() => setCount(count + 1)}>Count {count}</button>
    <button onClick={() => machine.send('Reserve')}>{machine.value}</button>
  </article>;
}`,
    );
    const register = async (ready = false, extraStudy = false) => {
      const variant = (id: string, name: string, from?: string) => `{
        id: ${JSON.stringify(id)}, name: ${JSON.stringify(name)}, description: 'A live update fixture.', rationale: 'Keep the reviewer in place.', color: '#eeeeee', component: Design,
        ${from ? `from: [${JSON.stringify(from)}],` : ''}
        controls: { state: { favourited: { type: 'boolean', label: 'Favourited?', default: false } },
          props: { radius: { type: 'number', label: 'Radius', default: 8, min: 0, max: 40 } },
          machine: { initial: 'available', states: { available: { on: { Reserve: 'reserved' } }, reserved: {} } } }
      }`;
      await writeFile(
        resolve(root, 'xuui.studies.ts'),
        `import { defineStudy } from ${JSON.stringify(resolve('src/xuui/model.ts'))};
import { Design } from './Design';
export const studies = [defineStudy({ id: 'live-study', name: 'Live study', description: 'Live updates', variants: [
  ${variant('original-v1', 'Original')}, ${variant('second-v1', 'Second')}${ready ? `, ${variant('new-v2', 'New direction', 'original-v1')}` : ''}
] })${extraStudy ? `, defineStudy({ id: 'added-study', name: 'Added study', description: 'A new study', variants: [${variant('added-v1', 'Added')}] })` : ''}];`,
      );
    };
    await register();
    const portServer = createServer();
    portServer.listen(0, '127.0.0.1');
    await once(portServer, 'listening');
    const address = portServer.address();
    if (!address || typeof address === 'string') throw new Error('No port');
    await new Promise<void>((done) => portServer.close(() => done()));
    const child = spawn(
      process.execPath,
      [
        resolve('src/cli.ts'),
        'dev',
        '--project-dir',
        root,
        '--port',
        String(address.port),
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const client = new Client({ name: 'live-update-test', version: '1.0.0' });
    try {
      await new Promise<void>((done, reject) => {
        let output = '';
        const timer = setTimeout(
          () => reject(new Error(`Studio did not start: ${output}`)),
          15000,
        );
        child.stdout.on('data', (chunk) => {
          output += chunk;
          if (output.includes(`127.0.0.1:${address.port}`)) {
            clearTimeout(timer);
            done();
          }
        });
        child.stderr.on('data', (chunk) => {
          output += chunk;
        });
        child.once('exit', () => {
          clearTimeout(timer);
          reject(new Error(output));
        });
      });
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [resolve('src/xuui/mcp.ts'), '--project-dir', root],
          stderr: 'pipe',
        }),
      );
      const report: Workspace['report'] = async (status, overrides = {}) => {
        const result = await client.callTool({
          name: 'xuui_report_variant_progress',
          arguments: {
            status,
            studyId: 'live-study',
            variantId: 'new-v2',
            ...(status === 'working'
              ? {
                  name: 'New direction',
                  from: ['original-v1'],
                  width: 320,
                  height: 240,
                }
              : {}),
            ...overrides,
          },
        });
        expect(result.isError).not.toBe(true);
      };
      await use({ url: `http://127.0.0.1:${address.port}`, register, report });
    } finally {
      await client.close();
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      if (child.exitCode === null) await exited;
      await rm(root, { recursive: true, force: true });
    }
  },
});

async function moveCamera(page: Page) {
  const canvas = page.getByRole('main', { name: 'Variant canvas' });
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(85, 45);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -15);
  await page.keyboard.up('Control');
  await expect(page.locator('[data-canvas-scene]')).not.toHaveAttribute(
    'data-canvas-scale',
    '1',
  );
}

test('a working menu item opens its named variant and stays selected through reload and completion', async ({
  page,
  workspace,
}) => {
  await workspace.report('working');
  await page.goto(`${workspace.url}/?study=live-study&variant=original-v1`);
  const pending = page.getByRole('link', {
    name: 'New direction (in progress)',
    exact: true,
  });
  const row = (await pending.boundingBox())!;
  const spinner = (await pending
    .locator('[data-variant-spinner]')
    .boundingBox())!;
  // The rotating SVG's bounds grow; its center stays in the right-aligned slot.
  expect(row.x + row.width - spinner.x - spinner.width / 2).toBeCloseTo(14, 0);
  const all = page.getByRole('link', { name: 'All variants', exact: true });
  await expect(all.locator('[data-variant-spinner]')).toHaveCount(1);
  await expect(all.getByText('1 working')).toHaveClass('sr-only');
  await pending.click();
  await expect(page).toHaveURL(/study=live-study&variant=new-v2$/);
  await expect(pending).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-variant-id]')).toHaveCount(1);
  await expect(page.locator('[data-variant-loading]')).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/variant=new-v2$/);
  await expect(pending).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-variant-loading]')).toBeVisible();
  await workspace.register(true);
  await expect(page.locator('[data-variant-id="new-v2"] h2')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'New direction', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-variant-spinner]')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/variant=original-v1$/);
  await workspace.report('done');
});

test('working connectors and artboard outlines shoot gradients left to right and stay static for reduced motion', async ({
  page,
  workspace,
}) => {
  await workspace.report('working');
  await page.goto(`${workspace.url}/?variant=original-v1&view=all`);
  const gradients = [
    page.locator('.lineage-lines linearGradient'),
    page.locator('.variant-loading-outline linearGradient'),
  ];
  const positions = (gradient: Locator) =>
    gradient.evaluate(async (element: SVGLinearGradientElement) => {
      const svg = element.ownerSVGElement!;
      const previousTime = svg.getCurrentTime();
      svg.pauseAnimations();
      const sample = async (time: number) => {
        svg.setCurrentTime(time);
        await new Promise(requestAnimationFrame);
        const transforms = element.gradientTransform.animVal;
        return transforms.numberOfItems ? transforms.getItem(0).matrix.e : 0;
      };
      try {
        return [await sample(0.4), await sample(0.9)];
      } finally {
        svg.setCurrentTime(previousTime);
        svg.unpauseAnimations();
      }
    });
  for (const gradient of gradients) {
    await expect(gradient).toHaveCount(1);
    const [earlier, later] = await positions(gradient);
    expect(later).toBeGreaterThan(earlier);
  }
  await expect(page.locator('[data-variant-loading-outline]')).toHaveCSS(
    'stroke',
    /url\(/,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const gradient of gradients) {
    await expect(gradient.locator('animateTransform')).toHaveCount(0);
    const [stillEarlier, stillLater] = await positions(gradient);
    expect(stillLater).toBe(stillEarlier);
  }
  await workspace.register(true);
  await expect(page.locator('[data-variant-id="new-v2"] h2')).toBeAttached();
  for (const gradient of gradients) await expect(gradient).toHaveCount(0);
  await workspace.report('done');
});

test('three named working variants branch from one parent with distinct connector and outline gradients', async ({
  page,
  workspace,
}) => {
  const directions = [
    { variantId: 'spacing-v2', name: 'Refined spacing' },
    { variantId: 'compact-v2', name: 'Compact layout' },
    { variantId: 'type-v2', name: 'Editorial type' },
  ];
  for (const direction of directions)
    await workspace.report('working', direction);
  await page.goto(`${workspace.url}/?variant=original-v1&view=all`);
  await expect(page.locator('[data-variant-loading]')).toHaveCount(3);
  await expect(page.locator('[data-lineage-line^="original-v1:"]')).toHaveCount(
    3,
  );
  await expect(
    page.locator('[data-lineage-line][data-lineage-working]'),
  ).toHaveCount(3);
  await expect(page.locator('[data-variant-loading-outline]')).toHaveCount(3);
  for (const direction of directions) {
    await expect(
      page.getByRole('link', {
        name: `${direction.name} (in progress)`,
        exact: true,
      }),
    ).toBeVisible();
  }
  const gradients = page.locator(
    '.lineage-lines linearGradient, .variant-loading-outline linearGradient',
  );
  await expect(gradients).toHaveCount(6);
  const ids = await gradients.evaluateAll((elements) =>
    elements.map((element) => element.id),
  );
  expect(new Set(ids).size).toBe(6);
  await page.keyboard.press('Shift+Digit1');
  await page.screenshot({ path: '.xuui-test/three-working-variants.png' });
  for (const direction of directions) await workspace.report('done', direction);
});

test('loading and completed variants keep the active frame, camera, selection, and controls in place', async ({
  page,
  workspace,
}) => {
  await page.goto(
    `${workspace.url}/?study=live-study&variant=second-v1&view=all`,
  );
  const frame = page.locator('[data-variant-id="second-v1"]');
  await page.getByRole('switch', { name: 'Favourited?' }).check();
  await frame.locator('h2').click();
  await moveCamera(page);
  const before = (await frame.locator('h2').boundingBox())!;
  const zoom = await page
    .locator('[data-canvas-scene]')
    .getAttribute('data-canvas-scale');
  const heading = await frame.locator('h2').elementHandle();
  let navigations = 0;
  page.on('framenavigated', () => navigations++);
  await workspace.report('working');
  const loading = page.locator('[data-variant-id="new-v2"]');
  await expect(loading).toHaveAttribute('data-variant-loading', 'true');
  await expect(loading.getByRole('status')).toHaveAttribute(
    'aria-label',
    'Agent is working on New direction',
  );
  await expect(loading.locator('[data-xuui-design]')).toHaveCount(0);
  await expect(loading.locator('[data-frame-title]')).toHaveText(
    'New direction',
  );
  await expect(
    loading.locator('[data-frame-title] [data-variant-spinner]'),
  ).toBeVisible();
  await expect(loading.locator('[data-variant-spinner]')).toHaveAttribute(
    'stroke-width',
    '3',
  );
  const workingLine = page.locator('[data-lineage-line="original-v1:new-v2"]');
  await expect(workingLine).toHaveAttribute('data-lineage-working', 'true');
  await expect(workingLine).toHaveCSS('stroke', /url\(/);
  await expect(page.locator('.lineage-lines animateTransform')).toHaveCount(1);
  await expect(loading.locator('.variant-loading')).toHaveText('');
  await expect(
    loading.locator('.variant-loading-grid circle').first(),
  ).toHaveAttribute('r', '0.75');
  await expect(
    loading.locator('.variant-loading-grid circle').first(),
  ).toHaveCSS('animation-name', 'variant-dot-wave');
  await expect(
    page.getByRole('status', { name: 'Variant progress' }),
  ).toHaveText('1 working');
  expect(await heading!.evaluate((element) => element.isConnected)).toBe(true);
  await expect
    .poll(async () => (await frame.locator('h2').boundingBox())!.x)
    .toBeCloseTo(before.x, 0);
  await expect
    .poll(async () => (await frame.locator('h2').boundingBox())!.y)
    .toBeCloseTo(before.y, 0);
  await page.keyboard.press('Shift+Digit1');
  await expect
    .poll(async () => {
      const outline = (await page.locator('.selection-outline').boundingBox())!;
      const selected = (await frame.locator('h2').boundingBox())!;
      return Math.max(
        Math.abs(outline.x - selected.x),
        Math.abs(outline.y - selected.y),
        Math.abs(outline.width - selected.width),
      );
    })
    .toBeLessThan(2);
  await page.screenshot({ path: '.xuui-test/variant-loading.png' });
  // Restore the user's camera before the finished component arrives.
  await frame.locator('h2').click();
  await moveCamera(page);
  const beforeReady = (await frame.locator('h2').boundingBox())!;
  const readyZoom = await page
    .locator('[data-canvas-scene]')
    .getAttribute('data-canvas-scale');
  await workspace.register(true, true);
  await expect(loading.locator('h2')).toHaveText('Keep my place');
  await expect(loading).not.toHaveAttribute('data-variant-loading');
  await expect(workingLine).not.toHaveAttribute('data-lineage-working');
  await expect(page.locator('.lineage-lines linearGradient')).toHaveCount(0);
  await expect(loading.locator('[data-variant-spinner]')).toHaveCount(0);
  await expect(
    page.getByRole('link', {
      name: 'New direction (in progress)',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('status', { name: 'Variant progress' }),
  ).toBeEmpty();
  expect(navigations).toBe(0);
  expect(await heading!.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page).toHaveURL(/variant=second-v1&view=all/);
  await expect(
    page.getByRole('status', { name: 'Selected element' }),
  ).toContainText('Selected h2');
  await expect(frame.locator('p')).toHaveText('Favourited');
  await expect(page.locator('[data-canvas-scene]')).toHaveAttribute(
    'data-canvas-scale',
    readyZoom!,
  );
  expect(zoom).not.toBe('1');
  expect((await frame.locator('h2').boundingBox())!.x).toBeCloseTo(
    beforeReady.x,
    0,
  );
  expect((await frame.locator('h2').boundingBox())!.y).toBeCloseTo(
    beforeReady.y,
    0,
  );
  // Browser navigation must see studies added after the first mount.
  await page.getByRole('combobox', { name: 'Study', exact: true }).click();
  await page.getByRole('option', { name: 'Added study', exact: true }).click();
  await expect(page).toHaveURL(/study=added-study/);
  await page.goBack();
  await expect(page).toHaveURL(/study=live-study&variant=second-v1&view=all/);
  await workspace.report('done');
});

test('an unfinished comment keeps its text, caret, focus and pin through progress, arrival and reload', async ({
  page,
  workspace,
}) => {
  await page.goto(`${workspace.url}/?variant=original-v1&view=all`);
  await page.keyboard.press('c');
  await page.locator('[data-variant-id="original-v1"] h2').click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  const text = editor.getByPlaceholder('Add a comment');
  await text.fill('Still writing this thought.');
  await text.evaluate((element: HTMLTextAreaElement) =>
    element.setSelectionRange(6, 13),
  );
  const pin = await page
    .locator('[data-comment-pin]')
    .getAttribute('data-comment-pin');
  await workspace.report('working');
  await expect(page.locator('[data-variant-loading]')).toHaveCount(1);
  await workspace.register(true);
  await expect(page.locator('[data-variant-id="new-v2"] h2')).toBeAttached();
  await expect(text).toHaveValue('Still writing this thought.');
  await expect(text).toBeFocused();
  expect(
    await text.evaluate((element: HTMLTextAreaElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]),
  ).toEqual([6, 13]);
  await expect(page.locator(`[data-comment-pin="${pin}"]`)).toHaveCount(1);
  const camera = await page
    .locator('[data-canvas-scene]')
    .getAttribute('style');
  await page.reload();
  await expect(text).toHaveValue('Still writing this thought.');
  await expect(text).toBeFocused();
  await expect(page.locator('[data-canvas-scene]')).toHaveAttribute(
    'style',
    camera!,
  );
  await editor
    .getByRole('button', { name: 'Add comment', exact: true })
    .click();
  const drafts = page.getByRole('list', { name: 'Draft comments' });
  await expect(drafts).toContainText('Still writing this thought.');
  // Editing an already-added comment also retains unsaved changes.
  await page.locator(`[data-comment-pin="${pin}"]`).click();
  await text.fill('An unfinished edit to the existing comment.');
  await workspace.register(true, true);
  await expect(
    page.getByRole('combobox', { name: 'Study', exact: true }),
  ).toBeVisible();
  await expect(text).toHaveValue('An unfinished edit to the existing comment.');
  await page.reload();
  await expect(text).toHaveValue('An unfinished edit to the existing comment.');
  await expect(drafts).toContainText('Still writing this thought.');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(drafts).toContainText(
    'An unfinished edit to the existing comment.',
  );
  await workspace.report('done');
});

test('focused updates retain component state and reload restores controls, selected layers and camera', async ({
  page,
  workspace,
}) => {
  await page.goto(`${workspace.url}/?variant=second-v1`);
  await page.getByRole('switch', { name: 'Favourited?' }).check();
  await page
    .getByRole('button', { name: 'Interact with preview', exact: true })
    .click();
  await page.getByRole('button', { name: 'Count 0', exact: true }).click();
  await page.getByRole('button', { name: 'available', exact: true }).click();
  await page
    .getByRole('button', { name: 'Select layers', exact: true })
    .click();
  await page.locator('[data-xuui-design] h2').click();
  await moveCamera(page);
  const scene = page.locator('[data-canvas-scene]');
  const camera = await scene.getAttribute('style');
  await workspace.report('working');
  await expect(
    page.getByRole('status', { name: 'Variant progress' }),
  ).toHaveText('1 working');
  await expect
    .poll(async () =>
      (
        await page.request.get(`${workspace.url}/__xuui/variant-progress`)
      ).json(),
    )
    .toHaveLength(1);
  await expect(page.locator('[data-variant-loading]')).toHaveCount(0);
  await workspace.register(true);
  await expect(
    page.getByRole('link', { name: 'New direction', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Count 1', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'reserved', exact: true }),
  ).toBeVisible();
  await expect(scene).toHaveAttribute('style', camera!);
  await page.reload();
  await expect(page).toHaveURL(/variant=second-v1$/);
  await expect(page.locator('[data-xuui-design] p')).toHaveText('Favourited');
  await expect(
    page.getByRole('button', { name: 'reserved', exact: true }),
  ).toBeVisible();
  await expect(scene).toHaveAttribute('style', camera!);
  await expect(
    page.getByRole('status', { name: 'Selected element' }),
  ).toContainText('Selected h2');
  await workspace.report('done');
});

test('progress can be resumed, scoped to a study, cancelled, and viewed with reduced motion', async ({
  page,
  workspace,
}) => {
  await workspace.report('working', { studyId: 'another-study' });
  await workspace.report('working');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${workspace.url}/?variant=original-v1&view=all`);
  await expect(page.locator('[data-variant-loading]')).toHaveCount(1);
  await expect(
    page.locator('[data-variant-loading] .variant-loading-grid circle').first(),
  ).toHaveCSS('animation-name', 'none');
  const pending = page.getByRole('link', {
    name: 'New direction (in progress)',
    exact: true,
  });
  await expect(pending).toHaveText('New direction');
  await expect(pending.locator('[data-variant-spinner]')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(page.locator('.lineage-lines animateTransform')).toHaveCount(0);
  await page.getByRole('link', { name: 'Original', exact: true }).click();
  await expect(page).not.toHaveURL(/view=all/);
  await pending.focus();
  await pending.press('Enter');
  await expect(page).toHaveURL(/variant=new-v2$/);
  await expect(page.locator('[data-variant-loading]')).toBeInViewport();
  await page.reload();
  await expect(page.locator('[data-variant-loading]')).toHaveCount(1);
  await workspace.report('done');
  await expect(page.locator('[data-variant-loading]')).toHaveCount(0);
  await expect(pending).toHaveCount(0);
  await workspace.report('done');
  await page.getByRole('link', { name: 'All variants', exact: true }).click();
  await expect(page.locator('[data-variant-id]')).toHaveCount(2);
});

test('pending artboards are excluded from reviews and dismissed comment text survives arrivals', async ({
  page,
  workspace,
}) => {
  await page.goto(`${workspace.url}/?variant=original-v1&view=all`);
  await page.keyboard.press('c');
  const heading = page.locator('[data-variant-id="original-v1"] h2');
  await heading.click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  const text = editor.getByPlaceholder('Add a comment');
  await text.fill('A thought to come back to.');
  await page.getByRole('heading', { name: 'Comments', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await workspace.report('working');
  await expect(page.locator('[data-variant-loading]')).toHaveCount(1);
  await page.reload();
  await heading.click();
  await expect(text).toHaveValue('A thought to come back to.');
  await editor
    .getByRole('button', { name: 'Add comment', exact: true })
    .click();
  const posted = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/__xuui/reviews'),
  );
  await page
    .getByRole('button', { name: 'Submit review', exact: true })
    .click();
  const review = await (await posted).json();
  expect(review.variants.map((variant: { id: string }) => variant.id)).toEqual([
    'original-v1',
    'second-v1',
  ]);
  expect(review.comments[0].body).toBe('A thought to come back to.');
  await workspace.register(true);
  await expect(page.locator('[data-variant-id="new-v2"] h2')).toBeAttached();
  await expect(page.locator(`[data-review-id="${review.id}"]`)).toContainText(
    'A thought to come back to.',
  );
  await workspace.report('done');
});
