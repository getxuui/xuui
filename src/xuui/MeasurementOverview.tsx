import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { relativeBounds } from './workspaceGeometry';
import type { Bounds, Distance } from './workspaceGeometry';
import { MeasurementLines } from './MeasurementLines';

type Overview = { boxes: Bounds[]; distances: Distance[] };

export function MeasurementOverview({
  designRef,
  surfaceRef,
  scale,
}: {
  designRef: RefObject<HTMLDivElement | null>;
  surfaceRef: RefObject<HTMLDivElement | null>;
  scale: number;
}) {
  const [overview, setOverview] = useState<Overview>({
    boxes: [],
    distances: [],
  });
  useEffect(() => {
    let frame = 0;
    let previous = '';
    const update = () => {
      const design = designRef.current;
      const surface = surfaceRef.current;
      if (!design || !surface) return;
      const boxes: Bounds[] = [];
      const distances: Distance[] = [];
      const seen = new Set<string>();
      const add = (axis: 'x' | 'y', from: number, to: number, at: number) => {
        const value = Math.round(Math.abs(to - from) * 10) / 10;
        if (value <= 0 || distances.length >= 32) return;
        const key = `${axis}:${Math.round(from)}:${Math.round(to)}:${Math.round(at)}`;
        if (seen.has(key)) return;
        seen.add(key);
        distances.push({
          axis,
          from: Math.min(from, to),
          to: Math.max(from, to),
          at,
          value,
        });
      };
      for (const parent of design.querySelectorAll('*')) {
        if (
          !parent ||
          parent.closest('[aria-hidden="true"]') ||
          parent instanceof SVGElement
        )
          continue;
        const style = getComputedStyle(parent);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        const children = [...parent.children]
          .filter((child) => {
            const rect = child.getBoundingClientRect();
            const childStyle = getComputedStyle(child);
            return (
              rect.width > 1 &&
              rect.height > 1 &&
              childStyle.visibility !== 'hidden' &&
              childStyle.display !== 'none'
            );
          })
          .map((child) => relativeBounds(child, surface));
        if (children.length < 2) continue;
        const box = relativeBounds(parent, surface);
        boxes.push(...children);
        const left = Math.min(...children.map((child) => child.x));
        const right = Math.max(
          ...children.map((child) => child.x + child.width),
        );
        const top = Math.min(...children.map((child) => child.y));
        const bottom = Math.max(
          ...children.map((child) => child.y + child.height),
        );
        if (parseFloat(style.paddingLeft) > 0)
          add('x', box.x, left, box.y + box.height / 2);
        if (parseFloat(style.paddingRight) > 0)
          add('x', right, box.x + box.width, box.y + box.height / 2);
        if (parseFloat(style.paddingTop) > 0)
          add('y', box.y, top, box.x + box.width / 2);
        if (parseFloat(style.paddingBottom) > 0)
          add('y', bottom, box.y + box.height, box.x + box.width / 2);
        for (let index = 1; index < children.length; index++) {
          const a = children[index - 1];
          const b = children[index];
          if (
            b.y >= a.y + a.height &&
            b.x < a.x + a.width &&
            b.x + b.width > a.x
          )
            add(
              'y',
              a.y + a.height,
              b.y,
              box.x +
                box.width -
                Math.max((parseFloat(style.paddingRight) * scale) / 2, 8),
            );
          else if (
            b.x >= a.x + a.width &&
            b.y < a.y + a.height &&
            b.y + b.height > a.y
          )
            add('x', a.x + a.width, b.x, box.y + box.height / 2);
        }
      }
      const next = { boxes, distances };
      const key = JSON.stringify(next);
      if (key !== previous) {
        previous = key;
        setOverview(next);
      }
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [designRef, surfaceRef, scale]);
  return (
    <div
      role="group"
      aria-label="Layout measurements"
      className="pointer-events-none absolute inset-0"
    >
      {overview.boxes.map((box, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="overview-bound absolute"
          style={{
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
          }}
        />
      ))}
      <MeasurementLines distances={overview.distances} scale={scale} />
    </div>
  );
}
