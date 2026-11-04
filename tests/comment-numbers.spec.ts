import { expect, test } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { commentNumber } from '../src/xuui/commentNumbers';
import { readReviews, saveReview } from '../src/xuui/reviewStore';
import type { Submission } from '../src/xuui/model';

test('comment reservations stay unique under concurrent saves and never reuse deleted numbers', async () => {
  const directory = resolve('.xuui-test', `numbers-${crypto.randomUUID()}`);
  try {
    const ids = Array.from({ length: 40 }, () => crypto.randomUUID());
    const numbers = await Promise.all(
      ids.map((id) => commentNumber(directory, id)),
    );
    expect(new Set(numbers).size).toBe(ids.length);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(40);
    const retries = await Promise.all(
      Array.from({ length: 10 }, () => commentNumber(directory, ids[0])),
    );
    expect(new Set(retries)).toEqual(new Set([numbers[0]]));
    // Deleting a review or draft leaves its reservation in the workspace.
    await writeFile(resolve(directory, 'deleted-review.json'), '{}');
    await rm(resolve(directory, 'deleted-review.json'));
    expect(await commentNumber(directory, crypto.randomUUID())).toBe(41);
    expect(await commentNumber(directory, ids[0])).toBe(numbers[0]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('historical reviews and drafts share a durable workspace sequence across studies', async () => {
  const directory = resolve(
    '.xuui-test',
    `history-numbers-${crypto.randomUUID()}`,
  );
  const submission = (studyId: string): Submission => ({
    schemaVersion: 2,
    id: crypto.randomUUID(),
    studyId,
    variants: [
      { id: 'card-v1', name: 'Card', description: 'Card', rationale: 'Card' },
    ],
    comments: [
      {
        id: crypto.randomUUID(),
        variantId: 'card-v1',
        body: 'Make room.',
        createdAt: new Date().toISOString(),
        target: {
          selector: 'button',
          tagName: 'button',
          accessibleName: 'Save',
          text: 'Save',
          bounds: { x: 0, y: 0, width: 100, height: 40 },
          viewport: { width: 380, height: 540 },
        },
      },
    ],
  });
  try {
    await mkdir(directory, { recursive: true });
    const old = {
      ...submission('first-study'),
      submittedAt: new Date().toISOString(),
    };
    const file = resolve(directory, `${old.id}.json`);
    await writeFile(file, JSON.stringify(old));
    expect((await readReviews(directory))[0].comments[0].number).toBe(1);
    const draft = submission('second-study');
    expect(await commentNumber(directory, draft.comments[0].id)).toBe(2);
    const saved = await saveReview(directory, draft);
    expect(saved.comments[0].number).toBe(2);
    expect(await saveReview(directory, draft)).toEqual(saved);
    await rm(file);
    const later = await saveReview(directory, submission('third-study'));
    expect(later.comments[0].number).toBe(3);
    expect(
      (await readReviews(directory)).find((review) => review.id === saved.id),
    ).toEqual(saved);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
