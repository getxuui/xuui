import type { Ref } from 'react';
import type { Variant } from './model';
import type { StudioBindings } from './parameters';
import { GridOverlay } from './GridOverlay';
import type { Grid } from './grids';

export function VariantSurface({
  variant,
  bindings,
  designRef,
  grids,
}: {
  variant: Variant;
  bindings: StudioBindings;
  designRef?: Ref<HTMLDivElement>;
  grids: Grid[];
}) {
  const Design = variant.component;
  return (
    <div className="component-surround relative isolate flex-none">
      <div data-xuui-design ref={designRef} className="relative z-10">
        <Design {...bindings} />
      </div>
      <GridOverlay grids={grids} />
    </div>
  );
}
