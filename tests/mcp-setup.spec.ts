import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const run = promisify(execFile);

test('Codex setup is isolated, repeatable, preserves unrelated configuration, and supports opting out', async () => {
  try {
    await run('codex', ['--version']);
  } catch {
    test.skip(
      true,
      'This host does not have the optional Codex CLI installed.',
    );
  }
  const directory = resolve('.xuui-test', `codex-setup-${crypto.randomUUID()}`);
  await mkdir(directory, { recursive: true });
  const file = resolve(directory, 'config.toml');
  const original =
    'model = "kept-model"\n\n[mcp_servers.keep]\ncommand = "do-not-launch"\nargs = ["unchanged"]\nenabled = false\n';
  await writeFile(file, original);
  // CODEX_HOME is used for its documented purpose: a separate Codex config directory.
  const env = { ...process.env, CODEX_HOME: directory };
  const setup = (args: string[] = []) =>
    run(process.execPath, [resolve('scripts/setup-mcp.mjs'), ...args], { env });
  await setup(['--skip']);
  expect(await readFile(file, 'utf8')).toBe(original);
  await setup();
  const configured = await readFile(file, 'utf8');
  expect(configured).toContain('kept-model');
  const server = JSON.parse(
    (await run('codex', ['mcp', 'get', 'xuui', '--json'], { env })).stdout,
  );
  expect(server.transport).toMatchObject({
    command: process.execPath,
    args: [resolve('src/xuui/mcp.ts'), '--project-dir', process.cwd()],
  });
  expect(
    JSON.parse(
      (await run('codex', ['mcp', 'get', 'keep', '--json'], { env })).stdout,
    ).transport.args,
  ).toEqual(['unchanged']);
  await setup();
  expect(await readFile(file, 'utf8')).toBe(configured);
  await expect(setup(['--project-dir', resolve('..')])).rejects.toThrow();
  expect(await readFile(file, 'utf8')).toBe(configured);
});
