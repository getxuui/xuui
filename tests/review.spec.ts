import { expect, test } from '@playwright/test';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { xuuiReviewServer } from '../src/xuui/server';

test('submitted files survive a server restart, duplicate retries, and invalid requests', async () => {
  const directory = resolve('.xuui-test', `restart-${crypto.randomUUID()}`);
  await mkdir(directory, { recursive: true });
  const start = async () => {
    const server = await createServer({
      configFile: false,
      root: process.cwd(),
      logLevel: 'silent',
      cacheDir: resolve('.xuui-test/vite-api-cache'),
      plugins: [xuuiReviewServer({ projectId: 'test-project', directory })],
      server: { host: '127.0.0.1', port: 0 },
    });
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string')
      throw new Error('No test server address');
    return { server, url: `http://127.0.0.1:${address.port}/__xuui/reviews` };
  };
  let running = await start();
  const submission = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    projectId: 'test-project',
    iterations: [
      {
        id: 'card-v1',
        name: 'Card',
        description: 'A simple card.',
        rationale: 'Test the consumer-facing review contract.',
        parentIds: [],
        informedBy: [],
      },
    ],
    comments: [
      {
        id: crypto.randomUUID(),
        iterationId: 'card-v1',
        body: 'Make room for the label.',
        createdAt: new Date().toISOString(),
        target: {
          selector: 'button',
          tagName: 'button',
          accessibleName: 'Save',
          text: 'Save',
          bounds: { x: 20, y: 50, width: 100, height: 40 },
          viewport: { width: 380, height: 540 },
        },
      },
    ],
  };
  try {
    const post = (body: unknown, origin?: string) =>
      fetch(running.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(origin ? { Origin: origin } : {}),
        },
        body: JSON.stringify(body),
      });
    expect(
      (await post(submission, 'https://another-site.example')).status,
    ).toBe(403);
    expect((await post({ ...submission, comments: [] })).status).toBe(400);
    expect(
      (
        await post({
          ...submission,
          comments: [{ ...submission.comments[0], iterationId: 'missing' }],
        })
      ).status,
    ).toBe(400);
    expect(await readdir(directory)).toHaveLength(0);
    const response = await post(submission);
    expect(response.status).toBe(201);
    const saved = await response.json();
    expect(await (await post(submission)).json()).toEqual(saved);
    expect(
      (await readdir(directory)).filter((file) => file.endsWith('.json')),
    ).toHaveLength(1);
    await running.server.close();
    running = await start();
    expect(await (await fetch(running.url)).json()).toEqual([saved]);
  } finally {
    await running.server.close();
  }
});
