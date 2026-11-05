import type { Ref } from 'react';
import type { Variant } from './model';
import type { StudioBindings } from './parameters';
import { GridOverlay } from './GridOverlay';
import type { Grid } from './grids';
import type { VariantProgress } from './variantProgress';
import { VariantLoading } from './VariantLoading';

export function VariantSurface({
  variant,
  bindings,
  designRef,
  grids,
  progress,
}: {
  variant: Variant;
  bindings: StudioBindings;
  designRef?: Ref<HTMLDivElement>;
  grids: Grid[];
  progress?: VariantProgress;
}) {
  const Design = variant.component;
  return (
    <div className="component-surround relative isolate flex-none">
      <div
        data-xuui-design={progress ? undefined : ''}
        ref={designRef}
        className="relative z-10"
      >
        {progress ? <VariantLoading {...progress} /> : <Design {...bindings} />}
      </div>
      <GridOverlay grids={grids} />
    </div>
  );
}
