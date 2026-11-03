import type { Review, Variant } from './model';

type Lineage = Pick<Variant, 'id' | 'from' | 'answers'>;

/**
 * Columns of variant IDs, one per generation: a variant sits one column to
 * the right of its furthest parent. Within a column, variants follow their
 * parents' positions so lines cross as little as possible. Returns null when
 * the study has no lineage, so the canvas keeps its single row.
 */
export function lineageColumns(variants: Lineage[]): string[][] | null {
  if (!variants.some((variant) => variant.from?.length)) return null;
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const order = new Map(variants.map((variant, index) => [variant.id, index]));
  const depths = new Map<string, number>();
  const depth = (id: string): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;
    const parents = (byId.get(id)?.from ?? []).filter((parent) =>
      byId.has(parent),
    );
    const value = parents.length ? 1 + Math.max(...parents.map(depth)) : 0;
    depths.set(id, value);
    return value;
  };
  const columns: string[][] = [];
  for (const variant of variants)
    (columns[depth(variant.id)] ??= []).push(variant.id);
  // Offset from the column's middle, matching the vertically centred columns.
  const offsets = new Map<string, number>();
  columns.forEach((column, index) => {
    if (index > 0) {
      const centre = (id: string) => {
        const parents = (byId.get(id)?.from ?? []).filter((parent) =>
          offsets.has(parent),
        );
        return parents.length
          ? parents.reduce((sum, parent) => sum + offsets.get(parent)!, 0) /
              parents.length
          : 0;
      };
      column.sort(
        (a, b) => centre(a) - centre(b) || order.get(a)! - order.get(b)!,
      );
    }
    column.forEach((id, row) => offsets.set(id, row - (column.length - 1) / 2));
  });
  return columns;
}

export type LineageComment = {
  id: string;
  body: string;
  /** The comment's number in its review, as on its card and pin. */
  number: number;
};

export type LineageEdge = {
  from: string;
  to: string;
  comments: LineageComment[];
  /** Comment IDs already labelled on an earlier line; show only their pin. */
  repeated: Set<string>;
};

/**
 * Lines from each variant to the ones developed from it, labelled with the
 * submitted comments they answer, plus each variant's comments that no
 * variant answers yet, such as a verdict or feedback still to act on.
 */
export function lineageEdges(variants: Lineage[], reviews: Review[]) {
  const comments = new Map<string, LineageComment & { variantId: string }>();
  for (const review of reviews)
    review.comments.forEach((comment, index) =>
      comments.set(comment.id, {
        id: comment.id,
        body: comment.body,
        number: index + 1,
        variantId: comment.variantId,
      }),
    );
  const answered = new Set(
    variants.flatMap((variant) => variant.answers ?? []),
  );
  const labelled = new Set<string>();
  const edges: LineageEdge[] = [];
  for (const variant of variants)
    for (const parent of variant.from ?? []) {
      const own = (variant.answers ?? [])
        .map((id) => comments.get(id))
        .filter((comment) => comment?.variantId === parent)
        .map((comment) => comment!);
      const repeated = new Set(
        own.filter((comment) => labelled.has(comment.id)).map(({ id }) => id),
      );
      own.forEach((comment) => labelled.add(comment.id));
      edges.push({ from: parent, to: variant.id, comments: own, repeated });
    }
  const verdicts = new Map<string, LineageComment[]>();
  for (const variant of variants) {
    const own = [...comments.values()].filter(
      (comment) =>
        comment.variantId === variant.id && !answered.has(comment.id),
    );
    if (own.length) verdicts.set(variant.id, own);
  }
  return { edges, verdicts };
}
