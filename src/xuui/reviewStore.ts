import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  link,
  unlink,
} from 'node:fs/promises';
import { join } from 'node:path';
import {
  reviewSchema,
  submissionSchema,
  reviewReceiptSchema,
} from './model.ts';
import type { Review, Submission, ReviewReceipt } from './model.ts';

export async function readReviewReceipts(
  directory: string,
): Promise<ReviewReceipt[]> {
  const folder = join(directory, 'receipts');
  let files: string[];
  try {
    files = await readdir(folder);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  return Promise.all(
    files
      .filter((file) => /^[a-f0-9-]{36}\.json$/.test(file))
      .map(async (file) =>
        reviewReceiptSchema.parse(
          JSON.parse(await readFile(join(folder, file), 'utf8')),
        ),
      ),
  );
}

export async function acknowledgeReview(
  directory: string,
  reviewId: string,
): Promise<ReviewReceipt | null> {
  if (!(await readReview(directory, reviewId))) return null;
  const folder = join(directory, 'receipts');
  await mkdir(folder, { recursive: true });
  const receipt: ReviewReceipt = {
    schemaVersion: 1,
    reviewId,
    readAt: new Date().toISOString(),
  };
  const file = join(folder, `${reviewId}.json`);
  const temporary = join(folder, `.${reviewId}-${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, {
    flag: 'wx',
  });
  try {
    await link(temporary, file);
    return receipt;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    return reviewReceiptSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  } finally {
    await unlink(temporary);
  }
}

export async function readReview(
  directory: string,
  id: string,
): Promise<Review | null> {
  // Validate before constructing a path, including when used outside the MCP boundary.
  reviewSchema.shape.id.parse(id);
  try {
    return reviewSchema.parse(
      JSON.parse(await readFile(join(directory, `${id}.json`), 'utf8')),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function readReviews(directory: string): Promise<Review[]> {
  let files: string[];
  try {
    files = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const records = await Promise.all(
    files
      .filter((file) => /^[a-f0-9-]{36}\.json$/.test(file))
      .map((file) => readReview(directory, file.slice(0, -5))),
  );
  return records
    .filter((record): record is Review => record !== null)
    .sort(
      (a, b) =>
        b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id),
    );
}

export async function saveReview(
  directory: string,
  submission: Submission,
): Promise<Review> {
  await mkdir(directory, { recursive: true });
  const review: Review = {
    ...submission,
    submittedAt: new Date().toISOString(),
  };
  const file = join(directory, `${review.id}.json`);
  const temporary = join(directory, `.${review.id}-${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(review, null, 2)}\n`, {
    flag: 'wx',
  });
  try {
    // Publish only completed files, without overwriting an earlier submission.
    await link(temporary, file);
    return review;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const existing = await readReview(directory, review.id);
    if (!existing) throw new Error('The submitted review could not be read.');
    const { submittedAt: _, ...original } = existing;
    if (
      JSON.stringify(submissionSchema.parse(original)) !==
      JSON.stringify(submission)
    )
      throw new Error(
        'This review ID has already been submitted with different content.',
      );
    return existing;
  } finally {
    await unlink(temporary);
  }
}
