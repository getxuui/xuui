import type { Distance } from './workspaceGeometry';

export function MeasurementLines({
  distances,
  scale = 1,
}: {
  distances: Distance[];
  scale?: number;
}) {
  return (
    <>
      {distances.map((distance, index) => (
        <div
          key={`${distance.axis}-${index}`}
          className={`measurement-line measurement-${distance.axis} absolute`}
          style={
            distance.axis === 'x'
              ? {
                  left: distance.from,
                  top: distance.at,
                  width: distance.to - distance.from,
                }
              : {
                  left: distance.at,
                  top: distance.from,
                  height: distance.to - distance.from,
                }
          }
        >
          <span
            className="measurement-label absolute whitespace-nowrap rounded-sm px-1 py-0.5 text-[11px] leading-4"
            aria-label={`${distance.axis === 'x' ? 'Horizontal' : 'Vertical'} distance ${Math.round((distance.value / scale) * 10) / 10} pixels`}
          >
            {Math.round((distance.value / scale) * 10) / 10}
          </span>
        </div>
      ))}
    </>
  );
}
