import { useEffect, useId, useState } from 'react';

// The canvas's padding box: rounded-xl (14px) less its 1px border.
const radius = 13;
// Labels sit this far outside the edge.
const labelRadius = radius + 10;
// Each ruler bends with the corner up to 45°, where the other one meets it.
const quarter = Math.PI / 4;
const minorTicks = 8;

type Axis = 'x' | 'y';

/* Where a position along an edge falls. Spacing is measured along the edge
   itself, so ticks stay evenly spaced around the curve. */
function locate(position: number, length: number) {
  const fromEnd = length - position;
  const edge = Math.min(position, fromEnd);
  if (edge >= radius) return { corner: null, angle: 0 } as const;
  const angle = (radius - edge) / radius;
  if (angle > quarter + 1e-6) return null;
  return {
    corner: position < fromEnd ? ('start' as const) : ('end' as const),
    angle,
  };
}

function tick(
  axis: Axis,
  position: number,
  length: number,
  size: number,
): string | null {
  const place = locate(position, length);
  if (!place) return null;
  if (!place.corner)
    return axis === 'x' ? `M${position} 0v${size}` : `M0 ${position}h${size}`;
  // Around a corner the tick points at the corner's centre.
  const { angle } = place;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const centre = place.corner === 'start' ? radius : length - radius;
  const sign = place.corner === 'start' ? -1 : 1;
  const [x, y, dx, dy] =
    axis === 'x'
      ? [centre + sign * radius * sin, radius - radius * cos, -sign * sin, cos]
      : [radius - radius * cos, centre + sign * radius * sin, cos, -sign * sin];
  return `M${x} ${y}l${dx * size} ${dy * size}`;
}

/* Each digit follows the concentric arc. Extend past the 45° fade boundary
   so the ends of a label aren't clipped as its centre reaches the corner. */
function labelPath(axis: Axis, length: number) {
  const offset = radius - labelRadius;
  const arc = `A${labelRadius} ${labelRadius} 0 0`;
  return axis === 'x'
    ? `M${offset} ${radius}${arc} 1 ${radius} ${offset}H${length - radius}${arc} 1 ${length - offset} ${radius}`
    : `M${radius} ${offset}${arc} 0 ${offset} ${radius}V${length - radius}${arc} 0 ${radius} ${length - offset}`;
}

/* Keep label spacing constant along their path, including on the corners. */
function labelOffset(position: number, length: number) {
  const edge = Math.min(position, length - position);
  const angle = Math.max(0, (radius - edge) / labelRadius);
  if (angle >= quarter) return null;
  return {
    at: labelRadius * (Math.PI / 2) + position - radius,
    opacity: 1 - angle / quarter,
  };
}

export function RulerMarks({
  width,
  height,
  origin,
  scale,
  step,
  labels,
}: {
  width: number;
  height: number;
  origin: { x: number; y: number };
  scale: number;
  /** Distance between labelled ticks, in component pixels. */
  step: number;
  labels: (axis: Axis) => { value: number; position: number }[];
}) {
  const id = useId();
  const minor = (step * scale) / minorTicks;
  const ticks = (axis: Axis, major: boolean) => {
    const length = axis === 'x' ? width : height;
    const start = Math.ceil(-origin[axis] / minor);
    const end = Math.floor((length - origin[axis]) / minor);
    const paths: string[] = [];
    for (let index = start; index <= end; index++) {
      if ((index % minorTicks === 0) !== major) continue;
      const path = tick(
        axis,
        origin[axis] + index * minor,
        length,
        major ? 7 : 3,
      );
      if (path) paths.push(path);
    }
    return paths.join('');
  };
  return (
    <svg
      aria-hidden="true"
      className="ruler-marks pointer-events-none absolute inset-0 size-full overflow-visible"
    >
      {(['x', 'y'] as const).map((axis) => (
        <g key={axis}>
          <path className="ruler-tick" d={ticks(axis, false)} />
          <path className="ruler-tick is-major" d={ticks(axis, true)} />
          <path
            id={`${id}-${axis}`}
            d={labelPath(axis, axis === 'x' ? width : height)}
            fill="none"
          />
          {labels(axis).map((label) => {
            const placed = labelOffset(
              label.position,
              axis === 'x' ? width : height,
            );
            if (!placed) return null;
            return (
              <text
                key={label.value}
                data-ruler-axis={axis}
                data-ruler-value={label.value}
                className="ruler-label"
                opacity={placed.opacity}
              >
                {/* Glyphs follow the path, so labels bend with the corner. */}
                <textPath
                  href={`#${id}-${axis}`}
                  startOffset={placed.at}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {label.value}
                </textPath>
              </text>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

/* Keeps something mounted while it fades out, so it can animate both ways.
   With reduced motion it appears and disappears at once. */
export function usePresence(visible: boolean, duration = 200) {
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(visible);
  useEffect(() => {
    const instant = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (visible) {
      setMounted(true);
      // Start hidden for a frame so the fade-in runs.
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    if (instant) {
      setMounted(false);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timer);
  }, [visible, duration]);
  return { mounted, shown };
}
