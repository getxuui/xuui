import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

test('running tests does not invalidate an already-open development server', async ({
  browser,
}) => {
  const root = resolve('.xuui-test', `concurrent-${crypto.randomUUID()}`);
  await mkdir(root, { recursive: true });
  await writeFile(
    resolve(root, 'index.html'),
    '<html><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>',
  );
  await writeFile(
    resolve(root, 'main.tsx'),
    `import React from 'react';
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<h1>Workbench fixture</h1>);`,
  );

  const start = async (mode: string) => {
    const server = await createServer({
      configFile: resolve('vite.config.ts'),
      root,
      mode,
      // API integration servers have a different plugin list from the React workbench.
      plugins: mode === 'test' ? [{ name: 'xuui-test-server' }] : [],
      optimizeDeps:
        mode === 'test' ? { noDiscovery: true, include: ['react'] } : undefined,
      logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0, strictPort: false },
    });
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string')
      throw new Error('No server address');
    return { server, url: `http://127.0.0.1:${address.port}` };
  };
  const development = await start('development');
  let testing: Awaited<ReturnType<typeof start>> | undefined;
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(development.url);
    await expect(
      page.getByRole('heading', { name: 'Workbench fixture' }),
    ).toBeVisible();
    testing = await start('test');
    // Protocol tests only call the API; they do not populate a browser dependency cache.
    expect((await fetch(`${testing.url}/__xuui/reviews`)).status).toBe(200);
    await testing.server.close();
    testing = undefined;
    // A fresh browser must still be able to load the original server's React modules.
    const freshContext = await browser.newContext();
    try {
      const freshPage = await freshContext.newPage();
      await freshPage.goto(development.url);
      await expect(
        freshPage.getByRole('heading', { name: 'Workbench fixture' }),
      ).toBeVisible();
    } finally {
      await freshContext.close();
    }
  } finally {
    await context.close();
    await testing?.server.close();
    await development.server.close();
  }
});
