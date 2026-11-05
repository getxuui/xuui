import { execFileSync } from 'node:child_process';
import {
  chmod,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { esmExternalRequirePlugin } from 'rolldown/plugins';

const root = fileURLToPath(new URL('..', import.meta.url));
const bundledPackages = new Set(
  [
    '@fontsource-variable/geist',
    '@fontsource-variable/geist-mono',
    'shadcn',
    'tw-animate-css',
    'tailwindcss',
  ].map((name) => resolve(root, 'node_modules', name)),
);
process.chdir(root);
await rm('dist', { recursive: true, force: true });
execFileSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.package.json'],
  { stdio: 'inherit' },
);
await build({
  configFile: false,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'xuui-bundled-notices',
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue;
          for (const id of Object.keys(chunk.modules)) {
            const marker = '/node_modules/';
            const index = id.lastIndexOf(marker);
            if (index < 0) continue;
            const relative = id.slice(index + marker.length);
            const name = relative
              .split('/')
              .slice(0, relative.startsWith('@') ? 2 : 1)
              .join('/');
            bundledPackages.add(id.slice(0, index + marker.length) + name);
          }
        }
      },
    },
  ],
  resolve: { alias: { '@': resolve(root, 'src') } },
  publicDir: false,
  build: {
    outDir: 'dist/studio',
    lib: {
      entry: resolve(root, 'src/studio.tsx'),
      formats: ['es'],
      fileName: 'studio',
      cssFileName: 'studio',
    },
    rolldownOptions: {
      plugins: [
        esmExternalRequirePlugin({
          external: [
            'react',
            'react-dom',
            'react-dom/client',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
          ],
        }),
      ],
    },
  },
});
await mkdir('dist/public/cursors', { recursive: true });
for (const asset of [
  'xuui.svg',
  'xuui-dark.svg',
  'cursors/default.svg',
  'cursors/comment.svg',
  'cursors/comment-dark.svg',
])
  await cp(`public/${asset}`, `dist/public/${asset}`);
await chmod('dist/cli.js', 0o755);
for (const folder of bundledPackages) {
  const manifest = JSON.parse(
    await readFile(resolve(folder, 'package.json'), 'utf8'),
  );
  const destination = resolve(
    'dist/licenses',
    manifest.name.replaceAll('/', '--'),
  );
  await mkdir(destination, { recursive: true });
  await writeFile(
    resolve(destination, 'package.json'),
    `${JSON.stringify({ name: manifest.name, version: manifest.version, license: manifest.license }, null, 2)}\n`,
  );
  const entries = await readdir(folder);
  const notices = entries.filter((name) =>
    /^(licen[cs]e|copying|notice)/i.test(name),
  );
  for (const name of notices.length
    ? notices
    : entries.filter((name) => /^readme/i.test(name)))
    await cp(resolve(folder, name), resolve(destination, name), {
      recursive: true,
    });
}
