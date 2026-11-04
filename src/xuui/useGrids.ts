import { useState } from 'react';
import { gridsSchema } from './grids';
import type { Grid } from './grids';
import type { Variant } from './model';

export function useGrids(studyId: string) {
  const [overrides, setOverrides] = useState<
    Record<string, Grid[] | undefined>
  >({});
  const keyFor = (id: string) => `xuui:${studyId}:${id}:grids:v1`;
  const forVariant = (variant: Variant): Grid[] => {
    const key = keyFor(variant.id);
    if (overrides[key]) return overrides[key];
    try {
      const stored = gridsSchema.safeParse(
        JSON.parse(localStorage.getItem(key) ?? 'null'),
      );
      if (stored.success) return stored.data;
    } catch {
      /* Authored grids still work without browser storage. */
    }
    return variant.grids ?? [];
  };
  const update = (id: string, grids: Grid[]) => {
    const parsed = gridsSchema.parse(grids);
    const key = keyFor(id);
    setOverrides((previous) => ({ ...previous, [key]: parsed }));
    try {
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch {
      /* Keep this visit's settings. */
    }
  };
  const reset = (id: string) => {
    const key = keyFor(id);
    try {
      localStorage.removeItem(key);
    } catch {
      /* Keep this visit usable. */
    }
    setOverrides((previous) => ({ ...previous, [key]: undefined }));
  };
  return { forVariant, update, reset };
}
