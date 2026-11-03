import { z } from 'zod';
import { commentSchema, reviewSchema, variantRecordSchema } from './model.ts';

// Translate saved alpha feedback at the storage boundary; the domain uses studies and variants.
export const legacyCommentSchema = commentSchema
  .omit({ variantId: true })
  .extend({ iterationId: commentSchema.shape.variantId })
  .transform(({ iterationId, ...comment }) => ({
    ...comment,
    variantId: iterationId,
  }));

const legacyReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: reviewSchema.shape.id,
    projectId: reviewSchema.shape.studyId,
    iterations: z.array(z.object(variantRecordSchema.shape)).min(1).max(200),
    comments: z.array(legacyCommentSchema).min(1).max(100),
    submittedAt: reviewSchema.shape.submittedAt,
  })
  .strict()
  .transform(({ projectId, iterations, ...review }) => ({
    ...review,
    schemaVersion: 2 as const,
    studyId: projectId,
    variants: iterations,
  }))
  .pipe(reviewSchema);

export const storedReviewSchema = z.union([reviewSchema, legacyReviewSchema]);
