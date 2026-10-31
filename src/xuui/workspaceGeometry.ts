import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export type Bounds = { x: number; y: number; width: number; height: number };
export type WorkspaceGeometry = {
  width: number;
  height: number;
  scale: number;
  origin: { x: number; y: number };
};

export function canvasScale(element: Element | null) {
  const scene = element?.closest<HTMLElement>('[data-canvas-scene]');
  return Number(scene?.dataset.canvasScale) || 1;
}

export function renderedLayers(design: Element | null): Element[] {
  if (!design) return [];
  return [...design.querySelectorAll('*')].filter((element) => {
    if (
      element instanceof SVGElement &&
      element.tagName.toLowerCase() !== 'svg'
    )
      return false;
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  });
}

export function useWorkspaceGeometry(
  surface: RefObject<HTMLDivElement | null>,
  design: RefObject<HTMLDivElement | null>,
) {
  const [geometry, setGeometry] = useState<WorkspaceGeometry>({
    width: 0,
    height: 0,
    scale: 1,
    origin: { x: 0, y: 0 },
  });

  useLayoutEffect(() => {
    const update = () => {
      if (!surface.current) return;
      const area = surface.current.getBoundingClientRect();
      const component = design.current?.getBoundingClientRect();
      const next = {
        width: area.width,
        height: area.height,
        scale: canvasScale(design.current),
        origin: {
          x: (component?.left ?? area.left) - area.left,
          y: (component?.top ?? area.top) - area.top,
        },
      };
      setGeometry((previous) =>
        previous.width === next.width &&
        previous.height === next.height &&
        previous.scale === next.scale &&
        previous.origin.x === next.origin.x &&
        previous.origin.y === next.origin.y
          ? previous
          : next,
      );
    };
    const observer = new ResizeObserver(update);
    if (surface.current) observer.observe(surface.current);
    if (design.current) observer.observe(design.current);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('xuui:camera-change', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('xuui:camera-change', update);
    };
  }, [surface, design]);

  return geometry;
}

export function relativeBounds(element: Element, surface: Element): Bounds {
  const rect = element.getBoundingClientRect();
  const area = surface.getBoundingClientRect();
  return {
    x: rect.left - area.left,
    y: rect.top - area.top,
    width: rect.width,
    height: rect.height,
  };
}

export type Distance = {
  axis: 'x' | 'y';
  from: number;
  to: number;
  at: number;
  value: number;
};

export function measureBetween(anchor: Bounds, target: Bounds): Distance[] {
  const distances: Distance[] = [];
  const dimension = (
    axis: 'x' | 'y',
    start: number,
    size: number,
    otherStart: number,
    otherSize: number,
    at: number,
  ) => {
    const end = start + size;
    const otherEnd = otherStart + otherSize;
    const add = (a: number, b: number) => {
      const value = Math.round(Math.abs(a - b) * 10) / 10;
      if (value > 0)
        distances.push({
          axis,
          from: Math.min(a, b),
          to: Math.max(a, b),
          at,
          value,
        });
    };
    if (end <= otherStart) add(end, otherStart);
    else if (otherEnd <= start) add(otherEnd, start);
    else {
      add(start, otherStart);
      add(end, otherEnd);
    }
  };
  const separatedX =
    anchor.x + anchor.width <= target.x || target.x + target.width <= anchor.x;
  const separatedY =
    anchor.y + anchor.height <= target.y ||
    target.y + target.height <= anchor.y;
  if (separatedX || !separatedY)
    dimension(
      'x',
      anchor.x,
      anchor.width,
      target.x,
      target.width,
      anchor.y + anchor.height / 2,
    );
  if (separatedY || !separatedX)
    dimension(
      'y',
      anchor.y,
      anchor.height,
      target.y,
      target.height,
      anchor.x + anchor.width / 2,
    );
  return distances;
}
