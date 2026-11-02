#!/usr/bin/env node
import { spawn } from 'node:child_process';
import {
  cp,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { version } from './version.ts';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = `xuui ${version} — experimental alpha; breaking changes expected

Usage:
  xuui init [directory] [--no-install]  Create a standalone React study workspace
  xuui dev [--port 4400]               Start the local studio
  xuui mcp [--project-dir directory]   Run the optional stdio review server

Options:
  --project-dir directory   Workspace to serve or read (default: current directory)
  --help                   Show command help
  --version                Print the installed version
`;

async function init(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      'no-install': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  if (positionals.length > 1)
    throw new Error('Use xuui init [directory] [--no-install].');
  const target = resolve(positionals[0] ?? '.');
  try {
    if ((await readdir(target)).length)
      throw new Error(
        `${target} is not empty. Choose a new directory; existing files are never overwritten.`,
      );
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error;
  }
  await mkdir(target, { recursive: true });
  const template = join(packageRoot, 'templates/study');
  for (const entry of await readdir(template))
    await cp(join(template, entry), join(target, entry), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
  const manifest = JSON.parse(
    await readFile(join(target, 'package.json'), 'utf8'),
  );
  manifest.name =
    basename(target)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') || 'xuui-study';
  manifest.devDependencies.xuui = version;
  await writeFile(
    join(target, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  // npm excludes nested .gitignore files from tarballs; create the workspace's here.
  await writeFile(
    join(target, '.gitignore'),
    'node_modules/\n.xuui/.cache/\n.DS_Store\n',
  );
  console.log(
    `Created ${target}\nxuui ${version} is experimental; breaking changes are expected.`,
  );
  if (!values['no-install']) {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await new Promise<void>((done, reject) => {
      const child = spawn(npm, ['install'], {
        cwd: target,
        stdio: 'inherit',
        env: {
          ...process.env,
          PATH: `${dirname(process.execPath)}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`,
        },
      });
      child.on('error', reject);
      child.on('exit', (code) =>
        code === 0
          ? done()
          : reject(
              new Error(
                `Installation stopped. Run npm install in ${target} to retry.`,
              ),
            ),
      );
    });
  }
  console.log(
    `\nNext:\n  cd ${JSON.stringify(target)}\n${values['no-install'] ? '  npm install\n' : ''}  npx xuui dev\n\nEdit xuui.studies.ts and studies/ to present your work.`,
  );
}

async function dev(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      'project-dir': { type: 'string', default: process.cwd() },
      'review-dir': { type: 'string' },
      port: { type: 'string', default: '4400' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  const root = resolve(values['project-dir']);
  const registry = resolve(root, 'xuui.studies.ts');
  try {
    if (!(await stat(registry)).isFile()) throw new Error('Not a file');
  } catch {
    throw new Error(
      `No xuui.studies.ts in ${root}. Run xuui init in an empty directory, or use --project-dir.`,
    );
  }
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('--port must be an integer from 1 to 65535.');
  const [
    { createServer, normalizePath },
    { default: react },
    { default: tailwindcss },
    { xuuiReviewServer },
  ] = await Promise.all([
    import('vite'),
    import('@vitejs/plugin-react'),
    import('@tailwindcss/vite'),
    import('./xuui/server.ts'),
  ]);
  const fileUrl = (path: string) => `/@fs/${normalizePath(path)}`;
  const registryUrl = fileUrl(registry);
  const entry = '/__xuui_entry.tsx';
  const html = await readFile(
    join(packageRoot, 'templates/studio.html'),
    'utf8',
  );
  const studioAssets = new Set([
    '/xuui.svg',
    '/xuui-dark.svg',
    '/cursors/default.svg',
    '/cursors/comment.svg',
  ]);
  const server = await createServer({
    root,
    configFile: false,
    cacheDir: resolve(root, `node_modules/.vite-xuui-${version}`),
    publicDir: join(root, 'public'),
    resolve: { dedupe: ['react', 'react-dom'] },
    plugins: [
      {
        name: 'xuui-workspace',
        resolveId(id) {
          if (id === entry) return entry;
        },
        load(id) {
          if (id !== entry) return;
          return `import { mountStudio } from ${JSON.stringify(fileUrl(join(packageRoot, 'dist/studio/studio.js')))};
import { studies } from ${JSON.stringify(registryUrl)};
import ${JSON.stringify(fileUrl(join(packageRoot, 'dist/studio/studio.css')))};
mountStudio(document.getElementById('root'), studies);
if (import.meta.hot) import.meta.hot.accept(${JSON.stringify(registryUrl)}, () => location.reload());`;
        },
        configureServer(vite) {
          vite.middlewares.use((request, response, next) => {
            const pathname = request.url?.split('?')[0] ?? '';
            if (studioAssets.has(pathname)) {
              void readFile(join(packageRoot, 'dist/public', pathname.slice(1)))
                .then((asset) => {
                  response.setHeader('Content-Type', 'image/svg+xml');
                  response.end(request.method === 'HEAD' ? undefined : asset);
                })
                .catch(next);
              return;
            }
            if (request.url?.split('?')[0] !== '/') {
              next();
              return;
            }
            void vite
              .transformIndexHtml(request.url, html)
              .then((page) => {
                response.statusCode = 200;
                response.setHeader('Content-Type', 'text/html');
                response.end(page);
              })
              .catch(next);
          });
        },
      },
      react(),
      tailwindcss(),
      xuuiReviewServer({
        directory: values['review-dir'] ?? process.env.XUUI_REVIEW_DIR,
      }),
    ],
    optimizeDeps: {
      entries: [registry],
      include: [
        'react',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
    },
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
      fs: { allow: [root, packageRoot] },
      watch: { ignored: ['**/.xuui/**'] },
    },
  });
  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }
  console.log(`\nxuui ${version} — experimental alpha\nWorkspace: ${root}`);
  server.printUrls();
  const close = () => {
    void server.close().then(() => process.exit());
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) < 24)
    throw new Error(
      `xuui requires Node 24 or newer. This process is using Node ${process.versions.node}.`,
    );
  const [command, ...args] = process.argv.slice(2);
  if (command === '--version' || command === '-v') {
    console.log(version);
    return;
  }
  if (!command || command === '--help' || command === '-h') {
    console.log(usage);
    return;
  }
  if (command === 'init') return init(args);
  if (command === 'dev') return dev(args);
  if (command === 'mcp') {
    process.argv = [
      process.execPath,
      join(packageRoot, 'dist/xuui/mcp.js'),
      ...args,
    ];
    await import('./xuui/mcp.ts');
    return;
  }
  throw new Error(`Unknown command: ${command}. Use xuui --help.`);
}

main().catch((error: unknown) => {
  console.error(
    `xuui: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
