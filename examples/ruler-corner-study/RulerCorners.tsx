import type { CSSProperties } from 'react';
import type { StudioBindings } from '../../src/xuui/parameters';

/* The top-left of the studio canvas with its rulers, drawn with the studio's
   ruler classes. Only how labels behave at the rounded corners changes. */

type Corner = 'current' | 'stop' | 'arc' | 'upright';

const width = 480;
const height = 300;
// The canvas corner radius and the labels' distance outside the edge.
const radius = 12;
const offset = 10;
const arc = radius + offset;
const step = 64;
const quarter = Math.PI / 4;

type Placed = {
  value: number;
  x: number;
  y: number;
  rotate: number;
  opacity: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/* Places one label along an edge of the given length. `along` is its distance
   from the edge's start; `normal` places it outside the edge. */
function place(
  corner: Corner,
  along: number,
  length: number,
  axis: 'x' | 'y',
): Omit<Placed, 'value'> | null {
  const toStart = along;
  const toEnd = length - along;
  const end = toStart < toEnd ? 'start' : 'end';
  const edge = Math.min(toStart, toEnd);
  const straight = (opacity: number) =>
    axis === 'x'
      ? { x: along, y: -offset, rotate: 0, opacity }
      : { x: -offset, y: along, rotate: 0, opacity };
  if (corner === 'current') return straight(clamp(edge / 20));
  // Gone by the point the edge starts to curve.
  if (corner === 'stop') return straight(clamp((edge - radius) / 12));
  if (edge >= radius) return straight(1);
  // Follow the corner on a circle around its centre, fading out by 45°,
  // where the other ruler's labels take over.
  const angle = (radius - edge) / arc;
  if (angle >= quarter) return null;
  const opacity = 1 - angle / quarter;
  const sign = end === 'start' ? -1 : 1;
  const centre = end === 'start' ? radius : length - radius;
  const rotate =
    corner === 'arc'
      ? ((axis === 'x' ? sign : -sign) * angle * 180) / Math.PI
      : 0;
  return axis === 'x'
    ? {
        x: centre + sign * arc * Math.sin(angle),
        y: radius - arc * Math.cos(angle),
        rotate,
        opacity,
      }
    : {
        x: radius - arc * Math.cos(angle),
        y: centre + sign * arc * Math.sin(angle),
        rotate,
        opacity,
      };
}

function labels(
  corner: Corner,
  length: number,
  origin: number,
  axis: 'x' | 'y',
): Placed[] {
  const first = Math.floor(-origin / step) - 1;
  const last = Math.ceil((length - origin) / step) + 1;
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const value = (first + index) * step;
    const placed = place(corner, origin + value, length, axis);
    return placed && placed.opacity > 0 ? { value, ...placed } : null;
  }).filter((label): label is Placed => label !== null);
}

function Rulers({ corner, pan }: { corner: Corner; pan: number }) {
  const origin = { x: 40 + pan, y: 44 + pan };
  return (
    <div
      className="relative font-sans"
      style={{ width, height }}
      data-xuui-layer-name="Canvas"
    >
      <div
        className="workspace-rulers absolute inset-0 overflow-hidden rounded-xl border border-canvas-border bg-canvas"
        style={
          {
            '--ruler-minor-step': `${step / 8}px`,
            '--ruler-major-step': `${step}px`,
          } as CSSProperties
        }
      >
        <div
          className="ruler-horizontal absolute inset-x-0 top-0 h-6"
          style={{ backgroundPosition: `${origin.x}px top` }}
        />
        <div
          className="ruler-vertical absolute inset-y-6 left-0 w-6"
          style={{ backgroundPosition: `left ${origin.y - 24}px` }}
        />
      </div>
      {labels(corner, width, origin.x, 'x').map((label) => (
        <span
          key={`x${label.value}`}
          data-ruler-axis="x"
          className="ruler-label absolute flex h-3 items-center justify-center rounded-sm px-0.5 font-mono text-[8px] leading-none tabular-nums"
          style={{
            left: label.x,
            top: label.y,
            opacity: label.opacity,
            transform: `translate(-50%, -50%) rotate(${label.rotate}deg)`,
          }}
        >
          {label.value}
        </span>
      ))}
      {labels(corner, height, origin.y, 'y').map((label) => (
        <span
          key={`y${label.value}`}
          data-ruler-axis="y"
          className="ruler-label absolute flex w-3 items-center justify-center rounded-sm py-0.5 font-mono text-[8px] leading-none tabular-nums [writing-mode:vertical-rl]"
          style={{
            left: label.x,
            top: label.y,
            opacity: label.opacity,
            transform: `translate(-50%, -50%) rotate(${label.rotate}deg)`,
          }}
        >
          {label.value}
        </span>
      ))}
    </div>
  );
}

/** The studio page around the canvas, so labels sit on its background. */
function Page({
  corner,
  bindings,
}: {
  corner: Corner;
  bindings: StudioBindings;
}) {
  const pan = Number(bindings.props.pan ?? 0);
  return (
    <div className="bg-studio-background p-8" data-xuui-layer-name="Studio">
      <Rulers corner={corner} pan={pan} />
    </div>
  );
}

export function CurrentCorners(bindings: StudioBindings) {
  return <Page corner="current" bindings={bindings} />;
}
export function StopCorners(bindings: StudioBindings) {
  return <Page corner="stop" bindings={bindings} />;
}
export function ArcCorners(bindings: StudioBindings) {
  return <Page corner="arc" bindings={bindings} />;
}
export function UprightCorners(bindings: StudioBindings) {
  return <Page corner="upright" bindings={bindings} />;
}
