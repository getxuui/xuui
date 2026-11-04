import { z } from 'zod';
import type { ComponentType } from 'react';
import type { Controls, StudioBindings } from './parameters.ts';
import { validateControls } from './parameters.ts';
import { gridsSchema } from './grids.ts';
import type { Grid } from './grids.ts';

const shortText = z.string().trim().min(1).max(300);

export const variantRecordSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .max(100),
    name: shortText,
    description: shortText,
    rationale: z.string().trim().min(1).max(4000),
  })
  .strict();

/* Authoring is stricter than stored reviews, which keep the older limits so
   reviews submitted before them still load. A one-line subtitle and a short
   paragraph let reviewers read both at a glance. */
const authoredVariantSchema = variantRecordSchema.extend({
  description: z.string().trim().min(1).max(100),
  rationale: z
    .string()
    .trim()
    .min(1)
    .max(280)
    .regex(/^[^\n]*$/, 'Write the rationale as a single paragraph.'),
});

export type VariantRecord = z.infer<typeof variantRecordSchema>;
export type Variant = VariantRecord & {
  component: ComponentType<StudioBindings>;
  color: string;
  controls?: Controls;
  /** Variants in the same study this one was developed from. */
  from?: string[];
  /** IDs of the submitted review comments this variant responds to. */
  answers?: string[];
  /**
   * Short labels the agent adds in the reviewer's words, such as "Shipped".
   * xuui shows them beside the variant's name and gives them no meaning.
   */
  labels?: string[];
  /** Alignment overlays measured in the variant's own CSS pixels. */
  grids?: Grid[];
};

const lineageSchema = z
  .object({
    from: z.array(z.string().min(1)).max(20).optional(),
    answers: z.array(z.uuid()).max(100).optional(),
    labels: z.array(z.string().trim().min(1).max(24)).max(3).optional(),
  })
  .strict();

export type Study = {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
};

/** The authoring boundary: ordinary React, with stable IDs and a little context. */
export function defineStudy(study: Study): Study {
  const ids = new Set<string>();
  for (const variant of study.variants) {
    authoredVariantSchema.parse(toVariantRecord(variant));
    lineageSchema.parse({
      from: variant.from,
      answers: variant.answers,
      labels: variant.labels,
    });
    validateControls(variant.controls);
    gridsSchema.parse(variant.grids ?? []);
    if (ids.has(variant.id))
      throw new Error(`Duplicate variant ID: ${variant.id}`);
    ids.add(variant.id);
  }
  // Lineage stays within the study and never loops back on itself.
  const parents = new Map(
    study.variants.map((variant) => [variant.id, variant.from ?? []]),
  );
  for (const [id, from] of parents)
    for (const parent of from)
      if (!ids.has(parent))
        throw new Error(`Variant ${id} comes from unknown variant ${parent}.`);
  const settled = new Set<string>();
  const visit = (id: string, path: string[]) => {
    if (path.includes(id))
      throw new Error(`Variant lineage loops: ${[...path, id].join(' → ')}.`);
    if (settled.has(id)) return;
    for (const parent of parents.get(id) ?? []) visit(parent, [...path, id]);
    settled.add(id);
  };
  for (const id of ids) visit(id, []);
  return study;
}

export function toVariantRecord({
  id,
  name,
  description,
  rationale,
}: Variant): VariantRecord {
  return { id, name, description, rationale };
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

export const commentNumberSchema = z.number().int().positive().safe();

export const commentSchema = z
  .object({
    id: z.uuid(),
    number: commentNumberSchema.optional(),
    variantId: shortText,
    body: z.string().trim().min(1).max(4000),
    target: targetSchema,
    createdAt: z.iso.datetime(),
    agentation: annotationSchema.optional(),
  })
  .strict();

export type Comment = z.infer<typeof commentSchema>;

export const submissionSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: z.uuid(),
    studyId: shortText,
    variants: z.array(variantRecordSchema).min(1).max(200),
    comments: z.array(commentSchema).min(1).max(100),
  })
  .strict()
  .superRefine((review, context) => {
    const ids = new Set(review.variants.map((variant) => variant.id));
    if (ids.size !== review.variants.length) {
      context.addIssue({
        code: 'custom',
        message: 'Variant IDs must be unique.',
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
      if (!ids.has(comment.variantId)) {
        context.addIssue({
          code: 'custom',
          message: 'A comment refers to an unregistered variant.',
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
    `# ${review.studyId} — submitted review`,
    `Review: ${review.id}`,
    `Submitted: ${review.submittedAt}`,
    '',
  ];
  review.comments.forEach((comment, index) => {
    const variant = review.variants.find(
      (item) => item.id === comment.variantId,
    );
    lines.push(
      `## ${comment.number ?? index + 1}. ${variant?.name ?? comment.variantId} (${comment.variantId})`,
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
