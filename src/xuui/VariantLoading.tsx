import type { CSSProperties } from 'react';

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
    </div>
  );
}
