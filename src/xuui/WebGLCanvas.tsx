import { useLayoutEffect, useRef } from 'react';
import { createCanvasRenderer } from './canvasRenderer';
import type { CanvasRenderer, Color } from './canvasRenderer';
import { canvasScale } from './workspaceGeometry';

type Point = { x: number; y: number };
const curves = new WeakMap<SVGPathElement, { d: string; points: Point[] }>();

/** The DOM supplies layout and hit targets; WebGL paints the workspace's
 * geometry. Keeping those sources also provides an immediate CSS/SVG fallback. */
function paintScene(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  renderer: CanvasRenderer,
) {
  const area = canvas.getBoundingClientRect();
  const style = getComputedStyle(root);
  const brand = readColor(style.getPropertyValue('--brand'));
  const selection = readColor(style.getPropertyValue('--selection'));
  const opacity = (color: Color, alpha: number): Color => [
    color[0],
    color[1],
    color[2],
    color[3] * alpha,
  ];
  const local = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x - area.x,
      y: rect.y - area.y,
      width: rect.width,
      height: rect.height,
    };
  };
  const visible = (box: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) =>
    box.x + box.width >= 0 &&
    box.y + box.height >= 0 &&
    box.x <= area.width &&
    box.y <= area.height;
  renderer.begin();

  // Connections are tessellated once in scene coordinates, then transformed
  // with the same DOM matrix as the artboards. Stroke width stays in CSS pixels.
  root
    .querySelectorAll<SVGPathElement>('[data-lineage-line]')
    .forEach((path) => {
      if (!visible(local(path))) return;
      const matrix = path.getScreenCTM();
      if (!matrix) return;
      const d = path.getAttribute('d') ?? '';
      let curve = curves.get(path);
      if (curve?.d !== d) {
        const length = path.getTotalLength();
        const steps = Math.max(16, Math.min(256, Math.ceil(length / 8)));
        curve = {
          d,
          points: Array.from({ length: steps + 1 }, (_, index) => {
            const point = path.getPointAtLength((length * index) / steps);
            return { x: point.x, y: point.y };
          }),
        };
        curves.set(path, curve);
      }
      const points = curve.points.map((point) => ({
        x: matrix.a * point.x + matrix.c * point.y + matrix.e - area.x,
        y: matrix.b * point.x + matrix.d * point.y + matrix.f - area.y,
      }));
      const gradient = path.parentElement?.querySelector('linearGradient');
      const transforms = gradient?.gradientTransform.animVal;
      const center = transforms?.numberOfItems
        ? transforms.getItem(0).matrix.e
        : 0;
      const pulse = gradient ? Math.abs(gradient.x2.baseVal.value) : 1;
      renderer.stroke(
        points,
        1.5,
        curve.points.map((point) =>
          opacity(
            brand,
            gradient
              ? 0.8 *
                  (0.2 +
                    0.8 * Math.max(0, 1 - Math.abs(point.x - center) / pulse))
              : 0.8,
          ),
        ),
      );
    });

  root.querySelectorAll<HTMLElement>('[data-grid-type]').forEach((grid) => {
    const box = local(grid);
    if (!visible(box)) return;
    const scale = canvasScale(grid);
    if (grid.dataset.gridType === 'pixels') {
      const period = Number(grid.dataset.gridSize) * scale;
      // Dense subpixel grids become a solid tint; leave them out at that zoom.
      if (period >= 3)
        renderer.rect(
          box.x,
          box.y,
          box.width,
          box.height,
          opacity(brand, 0.35),
          period,
          scale,
        );
    } else {
      for (const child of grid.children) {
        const cell = local(child);
        const x = Math.max(box.x, cell.x);
        const y = Math.max(box.y, cell.y);
        const width = Math.min(box.x + box.width, cell.x + cell.width) - x;
        const height = Math.min(box.y + box.height, cell.y + cell.height) - y;
        renderer.rect(x, y, width, height, opacity(brand, 0.12));
        if (width > 0 && height > 0)
          renderer.outline(x, y, width, height, opacity(brand, 0.24), scale);
      }
    }
  });

  root
    .querySelectorAll<HTMLElement>('.selection-outline, .measurement-target')
    .forEach((element) => {
      const box = local(element);
      if (visible(box))
        renderer.outline(box.x, box.y, box.width, box.height, selection);
    });
  return renderer.render(area.width, area.height);
}

// CSS tokens can use oklch, color-mix or aliases. The browser resolves these
// through its color parser; this tiny offscreen context is never a scene surface.
const colors = new Map<string, Color>();
let colorContext: CanvasRenderingContext2D | null = null;
function readColor(css: string): Color {
  const cached = colors.get(css);
  if (cached) return cached;
  colorContext ??= document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true });
  if (!colorContext) return [0, 0, 0, 1];
  colorContext.clearRect(0, 0, 1, 1);
  colorContext.fillStyle = css.trim();
  colorContext.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = colorContext.getImageData(0, 0, 1, 1).data;
  const color: Color = [r / 255, g / 255, b / 255, a / 255];
  colors.set(css, color);
  return color;
}

export function WebGLCanvas() {
  const surface = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = surface.current;
    const root = canvas?.parentElement;
    if (!canvas || !root) return;
    let renderer: CanvasRenderer | null = null;
    let frame = 0;
    let disposed = false;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fallback = () => {
      root.dataset.canvasRenderer = 'dom';
    };
    const draw = () => {
      frame = 0;
      if (!renderer || disposed) return;
      if (paintScene(root, canvas, renderer))
        root.dataset.canvasRenderer = 'webgl';
      // Static scenes redraw only when layout, theme or camera changes. Working
      // wires use their existing SVG animation clock, including reduced motion.
      if (!motion.matches && root.querySelector('[data-lineage-working]'))
        schedule();
    };
    const schedule = () => {
      if (!frame && !disposed && renderer) frame = requestAnimationFrame(draw);
    };
    const initialize = () => {
      renderer?.dispose();
      try {
        renderer = createCanvasRenderer(canvas);
      } catch {
        renderer = null;
      }
      if (renderer) schedule();
      else fallback();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      renderer = null;
      fallback();
    };
    const resized = new ResizeObserver(schedule);
    const observed = new Set<Element>();
    const observeLayout = () => {
      const next = new Set<Element>([
        root,
        ...root.querySelectorAll('[data-grid-overlays], [data-variant-id]'),
      ]);
      for (const element of observed) {
        if (!next.has(element)) {
          resized.unobserve(element);
          observed.delete(element);
        }
      }
      for (const element of next) {
        if (!observed.has(element)) {
          resized.observe(element);
          observed.add(element);
        }
      }
    };
    const mutations = new MutationObserver((records) => {
      // Buffer resizing and renderer status are our own writes.
      if (
        records.every(
          (record) =>
            record.target === canvas ||
            (record.target === root &&
              record.attributeName === 'data-canvas-renderer'),
        )
      )
        return;
      observeLayout();
      schedule();
    });
    mutations.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, { attributes: true });
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', initialize);
    window.addEventListener('xuui:camera-change', schedule);
    window.addEventListener('resize', schedule);
    root.addEventListener('scroll', schedule, true);
    motion.addEventListener('change', schedule);
    // A display change can alter DPR without resizing the CSS viewport.
    let density = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    );
    const densityChanged = () => {
      density.removeEventListener('change', densityChanged);
      density = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      );
      density.addEventListener('change', densityChanged);
      schedule();
    };
    density.addEventListener('change', densityChanged);
    observeLayout();
    initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resized.disconnect();
      mutations.disconnect();
      theme.disconnect();
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', initialize);
      window.removeEventListener('xuui:camera-change', schedule);
      window.removeEventListener('resize', schedule);
      root.removeEventListener('scroll', schedule, true);
      motion.removeEventListener('change', schedule);
      density.removeEventListener('change', densityChanged);
      renderer?.dispose();
      delete root.dataset.canvasRenderer;
    };
  }, []);
  return (
    <canvas
      ref={surface}
      data-webgl-canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full rounded-xl"
    />
  );
}
