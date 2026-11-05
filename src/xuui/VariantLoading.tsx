import type { CSSProperties } from 'react';
import { useId } from 'react';
import { WorkingGradient } from './WorkingGradient';

/** A quiet travelling wave through an artboard's dot grid. */
export function VariantLoading({
  name,
  width,
  height,
}: {
  name: string;
  width: number;
  height: number;
}) {
  const gradientId = `working-outline-${useId()}`;
  return (
    <div
      className="variant-loading"
      role="status"
      aria-label={`Agent is working on ${name}`}
      style={{ width, height }}
    >
      <svg
        aria-hidden="true"
        className="variant-loading-grid"
        width="100%"
        height="100%"
      >
        {Array.from({ length: Math.ceil(height / 20) }, (_, row) =>
          Array.from({ length: Math.ceil(width / 20) }, (_, column) => (
            <circle
              key={`${row}:${column}`}
              cx={column * 20 + 10}
              cy={row * 20 + 10}
              r="0.75"
              style={
                { '--dot-delay': `${-(row + column) * 0.09}s` } as CSSProperties
              }
            />
          )),
        )}
      </svg>
      <svg
        aria-hidden="true"
        className="variant-loading-outline"
        width={width}
        height={height}
      >
        <defs>
          <WorkingGradient id={gradientId} startX={0} endX={width} />
        </defs>
        <rect
          data-variant-loading-outline
          x="0.75"
          y="0.75"
          width={width - 1.5}
          height={height - 1.5}
          rx="11.25"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
