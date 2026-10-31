import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4401',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 4401 --mode test',
    url: 'http://127.0.0.1:4401',
    reuseExistingServer: false,
    env: { XUUI_REVIEW_DIR: '.xuui-test/reviews' },
  },
});
