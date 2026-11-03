import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';

type PanGesture = {
  pointerId: number;
  x: number;
  y: number;
  original: { x: number; y: number };
  moved: boolean;
};
type Point = { x: number; y: number };
type PinchGesture = { center: Point; distance: number };
type NativeGestureEvent = Event & {
  scale: number;
  clientX: number;
  clientY: number;
};

const cameraSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number().min(0.1).max(8),
});
type Camera = z.infer<typeof cameraSchema>;

function readCamera(key: string): Camera | null {
  try {
    const parsed = cameraSchema.safeParse(
      JSON.parse(localStorage.getItem(key) ?? 'null'),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCamera(key: string, camera: Camera) {
  try {
    localStorage.setItem(key, JSON.stringify(camera));
  } catch {
    // The camera still applies for this visit.
  }
}

export function CanvasViewport({
  children,
  studyId,
  activeId,
  mode,
  selection,
}: {
  children: ReactNode;
  studyId: string;
  activeId: string;
  mode: 'focused' | 'all';
  /** The selected layers, for zooming to the selection. */
  selection: Element[];
}) {
  const viewport = useRef<HTMLElement>(null);
  const selected = useRef(selection);
  selected.current = selection;
  const scene = useRef<HTMLDivElement>(null);
  const pan = useRef({ x: 0, y: 0 });
  const scale = useRef(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [zoomControlVisible, setZoomControlVisible] = useState(false);
  const zoomControl = useRef<HTMLButtonElement>(null);
  const zoomDismissTimer = useRef(0);
  const scheduleZoomDismiss = useCallback(() => {
    clearTimeout(zoomDismissTimer.current);
    zoomDismissTimer.current = window.setTimeout(() => {
      if (!zoomControl.current?.matches(':hover, :focus-visible'))
        setZoomControlVisible(false);
    }, 1400);
  }, []);
  const gesture = useRef<PanGesture | null>(null);
  const space = useRef(false);

  useEffect(() => () => clearTimeout(zoomDismissTimer.current), []);

  useLayoutEffect(() => {
    const area = viewport.current;
    const world = scene.current;
    if (!area || !world) return;
    const section = area.parentElement!;
    let clickTimer = 0;
    const touches = new Map<number, Point>();
    let pinch: PinchGesture | null = null;
    let nativePinch: { scale: number; center: Point } | null = null;
    // Each focused variant keeps its own camera. All variants recentres on
    // the selected one instead, so navigating there stays predictable.
    const storageKey =
      mode === 'focused' ? `xuui:${studyId}:${activeId}:camera:v1` : null;
    let saveTimer = 0;
    const save = () => {
      if (storageKey)
        writeCamera(storageKey, { ...pan.current, scale: scale.current });
      saveTimer = 0;
    };
    const apply = () => {
      world.style.transform = `translate(${pan.current.x}px, ${pan.current.y}px) scale(${scale.current})`;
      world.dataset.canvasScale = String(scale.current);
      world.style.setProperty('--canvas-zoom', String(scale.current));
      setZoomPercent(Math.round(scale.current * 100));
      window.dispatchEvent(new Event('xuui:camera-change'));
      if (!storageKey) return;
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(save, 150);
    };
    const zoomAt = (next: number, anchor: Point) => {
      const zoom = Math.max(0.1, Math.min(8, next));
      if (!Number.isFinite(zoom)) return;
      if (zoom !== scale.current) {
        setZoomControlVisible(true);
        scheduleZoomDismiss();
      }
      const bounds = world.getBoundingClientRect();
      const ratio = zoom / scale.current;
      pan.current = {
        x: pan.current.x + (anchor.x - bounds.left) * (1 - ratio),
        y: pan.current.y + (anchor.y - bounds.top) * (1 - ratio),
      };
      scale.current = zoom;
      apply();
    };
    const resetZoom = () => {
      const bounds = area.getBoundingClientRect();
      zoomAt(1, {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      });
    };
    // Fit the given elements inside the canvas, like a design tool's zoom to
    // fit and zoom to selection.
    const zoomToFit = (elements: Element[]) => {
      const bounds = () => {
        const rects = elements
          .map((element) => element.getBoundingClientRect())
          .filter((rect) => rect.width && rect.height);
        if (!rects.length) return null;
        const left = Math.min(...rects.map((rect) => rect.left));
        const top = Math.min(...rects.map((rect) => rect.top));
        const right = Math.max(...rects.map((rect) => rect.right));
        const bottom = Math.max(...rects.map((rect) => rect.bottom));
        return { left, top, width: right - left, height: bottom - top };
      };
      const before = bounds();
      if (!before) return;
      const room = area.getBoundingClientRect();
      const margin = 48;
      const factor = Math.min(
        (room.width - margin * 2) / before.width,
        (room.height - margin * 2) / before.height,
      );
      zoomAt(scale.current * factor, {
        x: before.left + before.width / 2,
        y: before.top + before.height / 2,
      });
      const after = bounds();
      if (!after) return;
      pan.current = {
        x:
          pan.current.x +
          room.x +
          room.width / 2 -
          (after.left + after.width / 2),
        y:
          pan.current.y +
          room.y +
          room.height / 2 -
          (after.top + after.height / 2),
      };
      apply();
    };
    const touchPinch = (): PinchGesture => {
      const [a, b] = [...touches.values()];
      return {
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
      };
    };
    const center = () => {
      const active = [
        ...world.querySelectorAll<HTMLElement>('[data-variant-id]'),
      ].find((element) => element.dataset.variantId === activeId);
      if (!active) return;
      const target = active.getBoundingClientRect();
      const bounds = area.getBoundingClientRect();
      pan.current = {
        x:
          pan.current.x +
          bounds.x +
          bounds.width / 2 -
          target.x -
          target.width / 2,
        y:
          pan.current.y +
          bounds.y +
          bounds.height / 2 -
          target.y -
          target.height / 2,
      };
      apply();
    };
    const inputTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest(
        'input,textarea,select,[contenteditable="true"],aside,[data-workspace-control]',
      );
    const keydown = (event: KeyboardEvent) => {
      if (
        event.key === '0' &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        if (!event.repeat) resetZoom();
        return;
      }
      // Zoom shortcuts also work from the sidebars, where layers and frame
      // titles are selected; only typing in a field keeps them out.
      if (
        event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        ['Digit0', 'Digit1', 'Digit2'].includes(event.code) &&
        !(
          event.target instanceof Element &&
          event.target.closest('input,textarea,select,[contenteditable="true"]')
        )
      ) {
        event.preventDefault();
        if (event.repeat) return;
        if (event.code === 'Digit0') resetZoom();
        else if (event.code === 'Digit1')
          zoomToFit([...world.querySelectorAll('[data-variant-id]')]);
        else
          zoomToFit(
            selected.current.length
              ? selected.current
              : [
                  ...world.querySelectorAll(
                    `[data-variant-id="${CSS.escape(activeId)}"] [data-xuui-design]`,
                  ),
                ],
          );
        return;
      }
      if (inputTarget(event.target)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        space.current = true;
        section.dataset.panMode = 'true';
      }
      if (event.key === 'Home') {
        event.preventDefault();
        center();
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        space.current = false;
        if (!gesture.current) delete section.dataset.panMode;
      }
    };
    const down = (event: PointerEvent) => {
      if (inputTarget(event.target)) return;
      if (event.pointerType === 'touch') {
        event.preventDefault();
        event.stopImmediatePropagation();
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        area.setPointerCapture(event.pointerId);
        area.focus({ preventScroll: true });
        section.dataset.panMode = 'true';
        section.dataset.panning = 'true';
        if (touches.size >= 2) {
          pinch = touchPinch();
          gesture.current = null;
        } else {
          gesture.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            original: { ...pan.current },
            moved: false,
          };
        }
        return;
      }
      const blank =
        event.target instanceof Element &&
        !event.target.closest('[data-xuui-design]');
      if (
        event.button !== 1 &&
        !(event.button === 0 && (space.current || blank))
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      area.focus({ preventScroll: true });
      gesture.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        original: { ...pan.current },
        moved: false,
      };
      section.dataset.panMode = 'true';
      section.dataset.panning = 'true';
      area.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (touches.has(event.pointerId)) {
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.size >= 2 && pinch) {
          const next = touchPinch();
          pan.current.x += next.center.x - pinch.center.x;
          pan.current.y += next.center.y - pinch.center.y;
          apply();
          zoomAt((scale.current * next.distance) / pinch.distance, next.center);
          pinch = next;
          section.dataset.panSuppressClick = 'true';
          return;
        }
      }
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const x = event.clientX - current.x;
      const y = event.clientY - current.y;
      current.moved ||= Math.hypot(x, y) >= 3;
      if (current.moved) {
        pan.current = { x: current.original.x + x, y: current.original.y + y };
        apply();
      }
    };
    const up = (event: PointerEvent) => {
      if (touches.delete(event.pointerId)) {
        if (area.hasPointerCapture(event.pointerId))
          area.releasePointerCapture(event.pointerId);
        if (pinch) section.dataset.panSuppressClick = 'true';
        pinch = touches.size >= 2 ? touchPinch() : null;
        if (touches.size) {
          const [pointerId, point] = [...touches.entries()][0];
          gesture.current = {
            pointerId,
            ...point,
            original: { ...pan.current },
            moved: true,
          };
          return;
        }
      }
      const current = gesture.current;
      if (current && current.pointerId !== event.pointerId) return;
      if (!current && !section.dataset.panSuppressClick) return;
      gesture.current = null;
      if (area.hasPointerCapture(event.pointerId))
        area.releasePointerCapture(event.pointerId);
      delete section.dataset.panning;
      if (current?.moved || section.dataset.panSuppressClick) {
        section.dataset.panSuppressClick = 'true';
        clickTimer = window.setTimeout(() => {
          delete section.dataset.panSuppressClick;
          if (!space.current) delete section.dataset.panMode;
        }, 0);
      } else if (!space.current) delete section.dataset.panMode;
    };
    const wheel = (event: WheelEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      const factor =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? area.clientHeight
            : 1;
      if (event.ctrlKey) {
        event.preventDefault();
        if (!nativePinch)
          zoomAt(scale.current * Math.exp(-event.deltaY * factor * 0.01), {
            x: event.clientX,
            y: event.clientY,
          });
        return;
      }
      if (event.metaKey || inputTarget(event.target)) return;
      event.preventDefault();
      pan.current = {
        x: pan.current.x - event.deltaX * factor,
        y: pan.current.y - event.deltaY * factor,
      };
      apply();
    };
    const gestureStart = (event: Event) => {
      event.preventDefault();
      if (touches.size >= 2) return;
      const native = event as NativeGestureEvent;
      const bounds = area.getBoundingClientRect();
      nativePinch = {
        scale: scale.current,
        center: {
          x:
            native.clientX >= bounds.left && native.clientX <= bounds.right
              ? native.clientX
              : bounds.x + bounds.width / 2,
          y:
            native.clientY >= bounds.top && native.clientY <= bounds.bottom
              ? native.clientY
              : bounds.y + bounds.height / 2,
        },
      };
    };
    const gestureChange = (event: Event) => {
      event.preventDefault();
      if (!nativePinch) return;
      zoomAt(
        nativePinch.scale * (event as NativeGestureEvent).scale,
        nativePinch.center,
      );
    };
    const gestureEnd = (event: Event) => {
      event.preventDefault();
      nativePinch = null;
    };
    const blur = () => {
      for (const id of touches.keys())
        if (area.hasPointerCapture(id)) area.releasePointerCapture(id);
      touches.clear();
      pinch = null;
      nativePinch = null;
      space.current = false;
      gesture.current = null;
      delete section.dataset.panMode;
      delete section.dataset.panning;
    };
    section.addEventListener('pointerdown', down, true);
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerup', up);
    area.addEventListener('pointercancel', up);
    section.addEventListener('wheel', wheel, { passive: false });
    section.addEventListener('gesturestart', gestureStart, { passive: false });
    section.addEventListener('gesturechange', gestureChange, {
      passive: false,
    });
    section.addEventListener('gestureend', gestureEnd, { passive: false });
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    window.addEventListener('xuui:center-canvas', center);
    window.addEventListener('xuui:reset-zoom', resetZoom);
    const stored = storageKey ? readCamera(storageKey) : null;
    if (stored) {
      pan.current = { x: stored.x, y: stored.y };
      scale.current = stored.scale;
      apply();
    } else center();
    return () => {
      clearTimeout(clickTimer);
      if (saveTimer) {
        clearTimeout(saveTimer);
        save();
      }
      blur();
      delete section.dataset.panSuppressClick;
      section.removeEventListener('pointerdown', down, true);
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerup', up);
      area.removeEventListener('pointercancel', up);
      section.removeEventListener('wheel', wheel);
      section.removeEventListener('gesturestart', gestureStart);
      section.removeEventListener('gesturechange', gestureChange);
      section.removeEventListener('gestureend', gestureEnd);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      window.removeEventListener('xuui:center-canvas', center);
      window.removeEventListener('xuui:reset-zoom', resetZoom);
    };
  }, [studyId, activeId, mode, scheduleZoomDismiss]);

  return (
    <>
      <main
        ref={viewport}
        aria-label="Variant canvas"
        tabIndex={-1}
        className="flex h-full min-h-0 min-w-0 touch-none items-center justify-center overflow-hidden rounded-xl p-6 outline-none sm:p-8"
      >
        <div
          ref={scene}
          data-canvas-scene
          className="relative flex w-max origin-top-left shrink-0 items-start gap-20"
        >
          {children}
        </div>
      </main>
      {zoomControlVisible && (
        <Button
          ref={zoomControl}
          data-workspace-control
          variant="outline"
          size="sm"
          className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2"
          aria-label="Reset zoom to 100%"
          aria-keyshortcuts="Meta+0 Control+0"
          title={`Zoom: ${zoomPercent}%. Reset to 100% (⌘0 / Ctrl+0)`}
          onClick={() => window.dispatchEvent(new Event('xuui:reset-zoom'))}
          onPointerLeave={scheduleZoomDismiss}
          onBlur={scheduleZoomDismiss}
        >
          <span className="min-w-10 font-mono text-xs tabular-nums">
            {zoomPercent}%
          </span>
          <RotateCcw data-icon="inline-end" />
        </Button>
      )}
    </>
  );
}
