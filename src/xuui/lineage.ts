import type { Comment, Review, Variant } from './model';

type Lineage = Pick<Variant, 'id' | 'from'>;

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
  // Keep siblings in their parents' order before assigning shared rows.
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
    column.forEach((id, row) => offsets.set(id, row));
  });
  return columns;
}

/** A child shares a parent's row; branches take the next available row. */
export function lineagePlacements(columns: string[][], variants: Lineage[]) {
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const placements = new Map<string, { gridColumn: number; gridRow: number }>();
  columns.forEach((column, index) => {
    const occupied = new Set<number>();
    for (const id of column) {
      const parents = (byId.get(id)?.from ?? []).flatMap((parent) => {
        const position = placements.get(parent);
        return position ? [position.gridRow] : [];
      });
      let row =
        parents.find((candidate) => !occupied.has(candidate)) ??
        parents[0] ??
        1;
      while (occupied.has(row)) row++;
      occupied.add(row);
      placements.set(id, { gridColumn: index + 1, gridRow: row });
    }
  });
  return placements;
}

export type LineageEdge = { from: string; to: string };

/** Lines from each variant to the ones developed from it. */
export function lineageEdges(variants: Lineage[]): LineageEdge[] {
  return variants.flatMap((variant) =>
    (variant.from ?? []).map((from) => ({ from, to: variant.id })),
  );
}

export type PostedComment = Comment & {
  /** The comment's workspace-wide number, as on its card. */
  number?: number;
};

/** Submitted comments, to show where they were posted on their artboards. */
export function postedComments(reviews: Review[]): PostedComment[] {
  return reviews.flatMap((review) =>
    review.comments.map((comment) => ({
      ...comment,
    })),
  );
}
