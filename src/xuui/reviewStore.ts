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
import { storedReviewSchema } from './legacyFeedback.ts';
import { commentNumber } from './commentNumbers.ts';

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

async function readStoredReview(
  directory: string,
  id: string,
): Promise<Review | null> {
  // Validate before constructing a path, including when used outside the MCP boundary.
  reviewSchema.shape.id.parse(id);
  try {
    return storedReviewSchema.parse(
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
      .map((file) => readStoredReview(directory, file.slice(0, -5))),
  );
  const reviews = records.filter((record): record is Review => record !== null);
  const comments = [
    ...new Map(
      reviews
        .flatMap((review) => review.comments)
        .map((comment) => [comment.id, comment]),
    ).values(),
  ].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  const numbers = new Map<string, number>();
  for (const comment of comments)
    numbers.set(comment.id, await commentNumber(directory, comment.id));
  return reviews
    .map((review) => ({
      ...review,
      comments: review.comments.map((comment) => ({
        ...comment,
        number: numbers.get(comment.id)!,
      })),
    }))
    .sort(
      (a, b) =>
        b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id),
    );
}

export async function readReview(
  directory: string,
  id: string,
): Promise<Review | null> {
  reviewSchema.shape.id.parse(id);
  return (
    (await readReviews(directory)).find((review) => review.id === id) ?? null
  );
}

export async function saveReview(
  directory: string,
  submission: Submission,
): Promise<Review> {
  await mkdir(directory, { recursive: true });
  // Register historical comments before allocating any new numbers.
  await readReviews(directory);
  submission = {
    ...submission,
    comments: await Promise.all(
      submission.comments.map(async (comment) => ({
        ...comment,
        number: await commentNumber(directory, comment.id),
      })),
    ),
  };
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
      JSON.stringify(submissionSchema.parse(submission))
    )
      throw new Error(
        'This review ID has already been submitted with different content.',
      );
    return existing;
  } finally {
    await unlink(temporary);
  }
}
