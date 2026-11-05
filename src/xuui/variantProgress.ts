import { z } from 'zod';

const id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/)
  .max(100);

export const variantProgressSchema = z
  .object({
    studyId: z.string().min(1).max(300),
    variantId: id,
    name: z
      .string()
      .trim()
      .min(1)
      .max(300)
      .describe(
        'Name the design direction, such as Paper, refined. Required when starting work; retained by the finished variant.',
      ),
    from: z.array(id).max(20).default([]),
    width: z.number().int().min(100).max(4000).default(400),
    height: z.number().int().min(100).max(4000).default(320),
  })
  .strict();

export const reportVariantProgressSchema = variantProgressSchema
  .extend({
    status: z.enum(['working', 'done']),
    name: variantProgressSchema.shape.name.optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'working' && !value.name)
      context.addIssue({
        code: 'custom',
        message: 'Name the variant you are starting.',
        path: ['name'],
      });
  });

export type VariantProgress = z.infer<typeof variantProgressSchema>;
