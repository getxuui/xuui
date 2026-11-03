import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const execute = promisify(execFile);
const run = (command, args, options = {}) =>
  execute(command, args, { timeout: 120000, ...options });
const temporary = await mkdtemp(join(tmpdir(), 'xuui-package-'));
const env = {
  ...process.env,
  PATH: `${dirname(process.execPath)}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`,
};
const root = resolve('.');
let server;
let browser;
let client;
let output = '';
try {
  const { stdout } = await run(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary],
    { cwd: root, env, maxBuffer: 1024 * 1024 },
  );
  const [packed] = JSON.parse(stdout);
  const paths = packed.files.map((file) => file.path);
  assert(
    !paths.some((path) =>
      /^(\.xuui\/|examples\/|tests\/|src\/|docs\/research\/)/.test(path),
    ),
    'The package includes local data, demos, tests, or source files.',
  );
  for (const path of [
    'dist/cli.js',
    'dist/xuui/mcp.js',
    'dist/index.d.ts',
    'dist/studio/studio.js',
    'dist/studio/studio.css',
    'LICENSE',
  ])
    assert(paths.includes(path), `Missing package asset: ${path}`);
  const tarball = join(temporary, packed.filename);
  await run('tar', ['-xzf', tarball, '-C', temporary]);
  const bootstrap = join(temporary, 'package/dist/cli.js');
  const workspace = join(temporary, 'my-study');
  await run(process.execPath, [bootstrap, 'init', workspace, '--no-install'], {
    env,
  });
  const generated = JSON.parse(
    await readFile(join(workspace, 'package.json'), 'utf8'),
  );
  assert.equal(
    generated.devDependencies['@getxuui/xuui'],
    packed.version,
    'The starter must pin the alpha.',
  );
  const original = await readFile(join(workspace, 'xuui.studies.ts'), 'utf8');
  await assert.rejects(
    run(process.execPath, [bootstrap, 'init', workspace, '--no-install'], {
      env,
    }),
    /not empty/,
  );
  assert.equal(
    await readFile(join(workspace, 'xuui.studies.ts'), 'utf8'),
    original,
  );
  console.log(
    'Package contents and non-destructive scaffold passed. Installing tarball in a clean workspace…',
  );
  await run(
    'npm',
    [
      'install',
      '--save-dev',
      '--save-exact',
      tarball,
      '--no-audit',
      '--no-fund',
    ],
    { cwd: workspace, env, maxBuffer: 1024 * 1024 },
  );
  const cli = join(workspace, 'node_modules/@getxuui/xuui/dist/cli.js');
  assert.equal(
    (
      await run(process.execPath, [cli, '--version'], { cwd: workspace, env })
    ).stdout.trim(),
    packed.version,
  );
  await run('npm', ['run', 'typecheck'], { cwd: workspace, env });
  await assert.rejects(
    run(process.execPath, [cli, 'dev', '--project-dir', temporary], { env }),
    /No xuui.studies.ts/,
  );
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  server = spawn(process.execPath, [cli, 'dev', '--port', String(port)], {
    cwd: workspace,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (data) => {
    output = (output + data).slice(-16000);
  });
  server.stderr.on('data', (data) => {
    output = (output + data).slice(-16000);
  });
  const origin = `http://127.0.0.1:${port}`;
  await expect
    .poll(
      async () => {
        if (server.exitCode !== null) throw new Error(output);
        try {
          return (await fetch(origin)).status;
        } catch {
          return 0;
        }
      },
      { timeout: 30000 },
    )
    .toBe(200);
  await mkdir(join(workspace, 'public'), { recursive: true });
  await writeFile(
    join(workspace, 'public/workspace-asset.txt'),
    'consumer-owned asset',
  );
  await expect
    .poll(async () => {
      const response = await fetch(`${origin}/workspace-asset.txt`);
      return response.ok ? response.text() : response.status;
    })
    .toBe('consumer-owned asset');
  assert.equal((await fetch(`${origin}/cursors/comment.svg`)).status, 200);
  await assert.rejects(
    run(process.execPath, [cli, 'dev', '--port', String(port)], {
      cwd: workspace,
      env,
    }),
    (error) =>
      !error.killed && error.code === 1 && /already in use/.test(error.stderr),
  );
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin);
  const heading = page.locator('[data-xuui-design] h2');
  await expect(heading).toHaveText('Make room to explore.');
  await page
    .getByRole('button', { name: 'Interact with preview', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Save this idea', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Saved', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Select layers', exact: true })
    .click();
  await heading.click();
  await expect(
    page.getByRole('button', { name: 'Copy layer properties', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Meta+l');
  const copied = new URL(
    await page.evaluate(() => navigator.clipboard.readText()),
  );
  assert.equal(copied.searchParams.get('variant'), 'starter-v1');
  assert.equal(copied.searchParams.get('study'), 'first-study');
  await page.getByRole('button', { name: 'Comment mode', exact: true }).click();
  await heading.click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  const input = editor.getByRole('textbox', { name: 'Comment', exact: true });
  await expect(input).toBeFocused();
  await input.fill('Feedback from the packed alpha.');
  await input.press('Control+Enter');
  const posted = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/__xuui/reviews'),
  );
  await page
    .getByRole('button', { name: 'Submit review', exact: true })
    .click();
  const response = await posted;
  assert.equal(response.status(), 201);
  const review = await response.json();
  const stored = JSON.parse(
    await readFile(
      join(workspace, '.xuui/reviews', `${review.id}.json`),
      'utf8',
    ),
  );
  assert.equal(stored.comments[0].body, 'Feedback from the packed alpha.');
  assert.equal(stored.schemaVersion, 2);
  assert.equal(stored.studyId, 'first-study');
  assert.equal(stored.comments[0].variantId, 'starter-v1');
  assert.deepEqual(
    stored.variants.map((variant) => variant.id),
    ['starter-v1'],
  );
  await writeFile(
    join(workspace, 'xuui.studies.ts'),
    original.replace('Make room to explore.', 'Updated in the workspace.'),
  );
  await expect(heading).toHaveText('Updated in the workspace.', {
    timeout: 15000,
  });
  await mkdir(join(root, '.xuui-test'), { recursive: true });
  await page.screenshot({ path: join(root, '.xuui-test/packed-alpha.png') });
  assert.deepEqual(errors, [], `Browser errors: ${errors.join(', ')}`);
  client = new Client({ name: 'xuui-package-check', version: '1.0.0' });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [cli, 'mcp', '--project-dir', workspace],
      stderr: 'pipe',
      cwd: temporary,
    }),
  );
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 4);
  const result = await client.callTool({
    name: 'xuui_read_review',
    arguments: { reviewId: review.id },
  });
  assert.notEqual(result.isError, true);
  assert.equal(result.structuredContent.review.id, review.id);
  console.log(
    `xuui ${packed.version}: clean install, types, live design, inspection, links, comments, persistence, hot reload, and compiled MCP passed.`,
  );
} catch (error) {
  if (output) console.error(output);
  throw error;
} finally {
  await client?.close();
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
  await rm(temporary, { recursive: true, force: true });
}
