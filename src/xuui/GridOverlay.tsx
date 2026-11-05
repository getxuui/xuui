import type { Grid } from './grids';

/** A sibling of the design, so overlays never become selectable layers. */
export function GridOverlay({ grids }: { grids: Grid[] }) {
  return (
    <div
      aria-hidden="true"
      data-grid-overlays
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {grids
        .filter((grid) => grid.visible !== false)
        .map((grid) =>
          grid.type === 'pixels' ? (
            <div
              key={grid.type}
              data-grid-type="pixels"
              data-grid-size={grid.size}
              className="pixel-grid absolute inset-0"
              style={{ backgroundSize: `${grid.size}px ${grid.size}px` }}
            />
          ) : (
            <div
              key={grid.type}
              data-grid-type={grid.type}
              className="layout-grid absolute inset-0 grid"
              style={
                grid.type === 'columns'
                  ? {
                      gridTemplateColumns: `repeat(${grid.count}, minmax(0, 1fr))`,
                      columnGap: grid.gutter,
                      paddingInline: grid.margin,
                    }
                  : {
                      gridTemplateRows: `repeat(${grid.count}, minmax(0, 1fr))`,
                      rowGap: grid.gutter,
                      paddingBlock: grid.margin,
                    }
              }
            >
              {Array.from({ length: grid.count }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          ),
        )}
    </div>
  );
}
