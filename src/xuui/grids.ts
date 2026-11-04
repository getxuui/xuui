import { z } from 'zod';

const spacing = z.number().finite().nonnegative();
export const gridSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('pixels'),
      size: z.number().finite().positive(),
      visible: z.boolean().optional(),
    })
    .strict(),
  ...(['columns', 'rows'] as const).map((type) =>
    z
      .object({
        type: z.literal(type),
        count: z.number().int().min(1).max(1000),
        gutter: spacing,
        margin: spacing,
        visible: z.boolean().optional(),
      })
      .strict(),
  ),
]);
export const gridsSchema = z
  .array(gridSchema)
  .max(3)
  .refine(
    (grids) => new Set(grids.map((grid) => grid.type)).size === grids.length,
    'Use one grid of each type per variant.',
  );
export type Grid = z.infer<typeof gridSchema>;

export const defaultGrids: Grid[] = [
  { type: 'pixels', size: 8 },
  { type: 'columns', count: 12, gutter: 16, margin: 24 },
  { type: 'rows', count: 6, gutter: 16, margin: 24 },
];
