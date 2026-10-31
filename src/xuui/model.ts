import { z } from 'zod';
import type { ComponentType } from 'react';
import type { Controls, StudioBindings } from './parameters.ts';
import { validateControls } from './parameters.ts';

const shortText = z.string().trim().min(1).max(300);

export const iterationRecordSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .max(100),
    name: shortText,
    description: shortText,
    parentIds: z.array(shortText).max(20),
    rationale: z.string().trim().min(1).max(4000),
    informedBy: z.array(shortText).max(100),
  })
  .strict();

export type IterationRecord = z.infer<typeof iterationRecordSchema>;
export type Iteration = IterationRecord & {
  component: ComponentType<StudioBindings>;
  color: string;
  controls?: Controls;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  iterations: Iteration[];
};

/** The authoring boundary: ordinary React, with stable IDs and a little context. */
export function defineProject(project: Project): Project {
  const ids = new Set<string>();
  for (const iteration of project.iterations) {
    iterationRecordSchema.parse(toIterationRecord(iteration));
    validateControls(iteration.controls);
    if (ids.has(iteration.id))
      throw new Error(`Duplicate iteration ID: ${iteration.id}`);
    ids.add(iteration.id);
  }
  const visited = new Set<string>();
  const visit = (id: string, ancestors = new Set<string>()) => {
    if (ancestors.has(id))
      throw new Error(`Circular iteration lineage at ${id}`);
    if (visited.has(id)) return;
    const iteration = project.iterations.find((item) => item.id === id);
    if (!iteration) throw new Error(`Unknown parent iteration: ${id}`);
    for (const parentId of iteration.parentIds) {
      visit(parentId, new Set([...ancestors, id]));
    }
    visited.add(id);
  };
  for (const id of ids) visit(id);
  return project;
}

export function toIterationRecord({
  id,
  name,
  description,
  parentIds,
  rationale,
  informedBy,
}: Iteration): IterationRecord {
  return { id, name, description, parentIds, rationale, informedBy };
}

const rectangleSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().nonnegative(),
    height: z.number().finite().nonnegative(),
  })
  .strict();

export const targetSchema = z
  .object({
    selector: z.string().min(1).max(2000),
    tagName: shortText,
    text: z.string().max(500),
    accessibleName: z.string().max(300),
    bounds: rectangleSchema,
    viewport: z
      .object({ width: z.number().positive(), height: z.number().positive() })
      .strict(),
    pin: z
      .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
      .strict()
      .optional(),
  })
  .strict();

export type FeedbackTarget = z.infer<typeof targetSchema>;

// Agentation's portable annotation fields, retained alongside xuui's variant identity.
const annotationSchema = z
  .object({
    id: shortText,
    x: z.number().finite(),
    y: z.number().finite(),
    comment: z.string().max(4000),
    element: z.string().max(500),
    elementPath: z.string().max(2000),
    timestamp: z.number().finite(),
    url: z.string().max(4000).optional(),
    boundingBox: rectangleSchema.optional(),
    fullPath: z.string().max(2000).optional(),
    cssClasses: z.string().max(4000).optional(),
    nearbyText: z.string().max(2000).optional(),
    computedStyles: z.string().max(12000).optional(),
    accessibility: z.string().max(2000).optional(),
    attributes: z.record(z.string(), z.string().max(500)).optional(),
  })
  .strict();

export const commentSchema = z
  .object({
    id: z.uuid(),
    iterationId: shortText,
    body: z.string().trim().min(1).max(4000),
    target: targetSchema,
    createdAt: z.iso.datetime(),
    agentation: annotationSchema.optional(),
  })
  .strict();

export type Comment = z.infer<typeof commentSchema>;

export const submissionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.uuid(),
    projectId: shortText,
    iterations: z.array(iterationRecordSchema).min(1).max(200),
    comments: z.array(commentSchema).min(1).max(100),
  })
  .strict()
  .superRefine((review, context) => {
    const ids = new Set(review.iterations.map((iteration) => iteration.id));
    if (ids.size !== review.iterations.length) {
      context.addIssue({
        code: 'custom',
        message: 'Iteration IDs must be unique.',
      });
    }
    if (
      new Set(review.comments.map((comment) => comment.id)).size !==
      review.comments.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Comment IDs must be unique.',
      });
    }
    for (const comment of review.comments) {
      if (!ids.has(comment.iterationId)) {
        context.addIssue({
          code: 'custom',
          message: 'A comment refers to an unregistered iteration.',
        });
      }
    }
  });

export type Submission = z.infer<typeof submissionSchema>;
export const reviewSchema = z
  .object({
    ...submissionSchema.shape,
    submittedAt: z.iso.datetime(),
  })
  .strict();
export type Review = z.infer<typeof reviewSchema>;

export const reviewReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    reviewId: z.uuid(),
    readAt: z.iso.datetime(),
  })
  .strict();
export type ReviewReceipt = z.infer<typeof reviewReceiptSchema>;

export function formatReview(review: Review): string {
  const lines = [
    `# ${review.projectId} — submitted review`,
    `Review: ${review.id}`,
    `Submitted: ${review.submittedAt}`,
    '',
  ];
  review.comments.forEach((comment, index) => {
    const iteration = review.iterations.find(
      (item) => item.id === comment.iterationId,
    );
    lines.push(
      `## ${index + 1}. ${iteration?.name ?? comment.iterationId} (${comment.iterationId})`,
      comment.body,
      '',
      `Target: ${comment.target.selector}`,
      `Element: ${comment.target.tagName}${comment.target.accessibleName ? ` “${comment.target.accessibleName}”` : ''}`,
      `Text: ${comment.target.text || '(no text)'}`,
      `Comment: ${comment.id}`,
      '',
    );
  });
  lines.push('Full record:', JSON.stringify(review, null, 2));
  return lines.join('\n');
}
