import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const { values } = parseArgs({
  options: {
    skip: { type: 'boolean', default: false },
    'project-dir': {
      type: 'string',
      default: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    },
    name: { type: 'string', default: 'xuui' },
  },
});

if (values.skip) {
  console.log(
    'MCP setup skipped. Local review files and copyable feedback remain available.',
  );
} else {
  const project = resolve(values['project-dir']);
  const command = process.execPath;
  const args = [
    resolve(dirname(fileURLToPath(import.meta.url)), '../src/xuui/mcp.ts'),
    '--project-dir',
    project,
  ];
  try {
    let existing;
    try {
      const result = await run('codex', ['mcp', 'get', values.name, '--json']);
      existing = JSON.parse(result.stdout);
    } catch (error) {
      if (error.code === 'ENOENT')
        throw new Error(
          'Codex CLI was not found. Install it or register the stdio command documented in README.md.',
        );
      if (!error.stderr?.includes('No MCP server named')) throw error;
    }
    if (existing) {
      if (
        existing.enabled &&
        existing.transport.type === 'stdio' &&
        existing.transport.command === command &&
        JSON.stringify(existing.transport.args) === JSON.stringify(args)
      ) {
        console.log(
          `Codex already has ${values.name} configured for ${project}.`,
        );
      } else {
        throw new Error(
          `The MCP name ${values.name} is already configured differently. It was left unchanged. Choose another name with --name.`,
        );
      }
    } else {
      await run('codex', ['mcp', 'add', values.name, '--', command, ...args]);
      console.log(
        `Configured Codex MCP server ${values.name} for ${project}. In the CLI, use /quit then codex resume --last to reload. Desktop clients can restart the server in MCP settings.`,
      );
    }
  } catch (error) {
    console.error(error.stderr || error.message);
    process.exitCode = 1;
  }
}
