import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  readVariantProgress,
  reportVariantProgress,
} from '../src/xuui/variantProgressStore';
import { readReviews } from '../src/xuui/reviewStore';

const run = promisify(execFile);

test('CLI progress survives separate processes, respects the workspace, and clears idempotently', async () => {
  const root = await mkdtemp(resolve('.xuui-test/progress-'));
  const directory = resolve(root, 'custom-reviews');
  const args = [
    resolve('dist/cli.js'),
    'progress',
    '--project-dir',
    root,
    '--review-dir',
    'custom-reviews',
    '--study',
    'a-study',
    '--variant',
    'new-v2',
  ];
  try {
    const result = await run(
      process.execPath,
      [
        ...args,
        '--name',
        'New direction',
        '--from',
        'first-v1',
        '--from',
        'second-v1',
        '--width',
        '640',
        '--height',
        '480',
      ],
      { cwd: resolve('..') },
    );
    expect(JSON.parse(result.stdout)).toEqual({
      studyId: 'a-study',
      variantId: 'new-v2',
      status: 'working',
    });
    expect(await readVariantProgress(directory)).toEqual([
      {
        studyId: 'a-study',
        variantId: 'new-v2',
        name: 'New direction',
        from: ['first-v1', 'second-v1'],
        width: 640,
        height: 480,
      },
    ]);
    expect(await readReviews(directory)).toEqual([]);
    await run(process.execPath, [...args, '--name', 'A clearer name']);
    expect(await readVariantProgress(directory)).toHaveLength(1);
    expect((await readVariantProgress(directory))[0].name).toBe(
      'A clearer name',
    );
    await run(process.execPath, [...args, '--done']);
    await run(process.execPath, [...args, '--done']);
    expect(await readVariantProgress(directory)).toEqual([]);
    expect(await readVariantProgress(resolve(root, '.xuui/reviews'))).toEqual(
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('progress keeps concurrent variants separate and rejects malformed signals without losing work', async () => {
  const directory = await mkdtemp(resolve('.xuui-test/progress-'));
  const working = {
    status: 'working',
    studyId: 'a-study',
    variantId: 'new-v2',
    name: 'New direction',
  };
  try {
    await Promise.all([
      reportVariantProgress(directory, working),
      reportVariantProgress(directory, { ...working, variantId: 'other-v2' }),
      reportVariantProgress(directory, { ...working, studyId: 'other-study' }),
    ]);
    expect(await readVariantProgress(directory)).toHaveLength(3);
    for (const invalid of [
      { ...working, variantId: '../outside' },
      { ...working, name: undefined },
      { ...working, name: '' },
      { ...working, name: '   ' },
      { ...working, width: -2 },
      { ...working, height: Number.NaN },
    ])
      await expect(reportVariantProgress(directory, invalid)).rejects.toThrow();
    expect(await readVariantProgress(directory)).toHaveLength(3);
    await reportVariantProgress(directory, {
      status: 'done',
      studyId: 'a-study',
      variantId: 'new-v2',
    });
    const remaining = await readVariantProgress(directory);
    expect(remaining).toHaveLength(2);
    expect(remaining.some((item) => item.studyId === 'other-study')).toBe(true);
    expect(remaining.some((item) => item.variantId === 'other-v2')).toBe(true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
