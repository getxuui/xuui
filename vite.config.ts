import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { xuuiReviewServer } from './src/xuui/server.ts';

export default defineConfig(({ mode }) => ({
  // Independent servers must not invalidate each other's optimized React files.
  cacheDir: `node_modules/.vite-xuui-${mode}`,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '#xuui-studies': fileURLToPath(
        new URL(
          mode === 'test'
            ? './tests/fixtures/studies.ts'
            : './examples/studies.ts',
          import.meta.url,
        ),
      ),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    xuuiReviewServer({
      directory: process.env.XUUI_REVIEW_DIR,
    }),
  ],
  server: { host: '127.0.0.1', port: 4400, strictPort: true },
}));
