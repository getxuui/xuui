import type { Ref } from 'react';
import type { Iteration } from './model';
import type { StudioBindings } from './parameters';

export function VariantSurface({
  iteration,
  bindings,
  designRef,
}: {
  iteration: Iteration;
  bindings: StudioBindings;
  designRef?: Ref<HTMLDivElement>;
}) {
  const Design = iteration.component;
  return (
    <div className="component-surround relative isolate flex-none rounded-[20px] p-[80px]">
      <div
        aria-hidden="true"
        data-canvas-decoration
        className="bg-canvas-hatch pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]"
      >
        <span
          data-hatch-extension="top"
          className="hatch-projection-horizontal absolute inset-x-0 top-[80px] h-px"
        />
        <span
          data-hatch-extension="bottom"
          className="hatch-projection-horizontal absolute inset-x-0 bottom-[80px] h-px"
        />
        <span
          data-hatch-extension="left"
          className="hatch-projection-vertical absolute inset-y-0 left-[80px] w-px"
        />
        <span
          data-hatch-extension="right"
          className="hatch-projection-vertical absolute inset-y-0 right-[80px] w-px"
        />
      </div>
      <div data-xuui-design ref={designRef} className="relative z-10">
        <Design {...bindings} />
      </div>
      <svg
        aria-hidden="true"
        data-canvas-decoration
        className="pointer-events-none absolute inset-0 size-full"
      >
        <rect
          x="0.5"
          y="0.5"
          rx="19.5"
          fill="none"
          strokeWidth="1"
          strokeDasharray="8 8"
          className="stroke-foreground/15"
          style={{ width: 'calc(100% - 1px)', height: 'calc(100% - 1px)' }}
        />
      </svg>
    </div>
  );
}
