import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, RefObject } from 'react';
import { cn } from '@/lib/utils';
import { CanvasSelection } from './CanvasSelection';
import { RulerMarks, usePresence } from './RulerMarks';
import { GuideEditor } from './GuideEditor';
import { relativeBounds, useWorkspaceGeometry } from './workspaceGeometry';
import type { Bounds } from './workspaceGeometry';
import type { LayerProperties } from './layerProperties';

const interval = 64;
type Axis = 'x' | 'y';
type Guide = { id: string; axis: Axis; position: number };
type Drag = {
  id: string;
  axis: Axis;
  original: number;
  created: boolean;
  moved: boolean;
  x: number;
  y: number;
  pointerId: number;
  control: HTMLElement;
};
type Editing = { id: string; x: number; y: number };

function readGuides(key: string, legacyKey: string): Guide[] {
  try {
    let stored = localStorage.getItem(key);
    if (stored === null) {
      stored = localStorage.getItem(legacyKey);
      if (stored !== null) {
        localStorage.setItem(key, stored);
        localStorage.removeItem(legacyKey);
      }
    }
    const saved: unknown = JSON.parse(stored ?? '[]');
    if (!Array.isArray(saved)) return [];
    const ids = new Set<string>();
    return saved.slice(0, 100).filter((guide): guide is Guide => {
      if (
        !guide ||
        typeof guide.id !== 'string' ||
        ids.has(guide.id) ||
        (guide.axis !== 'x' && guide.axis !== 'y') ||
        !Number.isFinite(guide.position)
      )
        return false;
      ids.add(guide.id);
      return true;
    });
  } catch {
    return [];
  }
}

function rulerStep(scale: number) {
  return interval * 2 ** Math.ceil(Math.log2(0.75 / scale));
}

function rulerLabels(length: number, origin: number, scale: number) {
  const step = rulerStep(scale);
  const start = Math.ceil((-origin - 32) / scale / step) * step;
  return Array.from(
    {
      length: Math.max(
        0,
        Math.floor(((length + 32 - origin) / scale - start) / step) + 1,
      ),
    },
    (_, index) => {
      const value = start + index * step;
      return { value, position: origin + value * scale };
    },
  );
}

export function WorkspaceRulers({
  designRef,
  studyId,
  variantId,
  visible,
  guidesVisible = true,
  selectionEnabled = true,
  selection,
  onSelect,
  onInspect,
}: {
  designRef: RefObject<HTMLDivElement | null>;
  studyId: string;
  variantId: string;
  visible: boolean;
  guidesVisible?: boolean;
  selectionEnabled?: boolean;
  selection: Element[];
  onSelect: (elements: Element[]) => void;
  onInspect?: (layer: LayerProperties | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const geometry = useWorkspaceGeometry(container, designRef);
  // Rulers and guides fade in and out instead of popping.
  const rulers = usePresence(visible);
  const guideFade = usePresence(guidesVisible);
  const storageKey = `xuui:${studyId}:${variantId}:guides:v1`;
  const [guides, setGuides] = useState<Guide[]>(() =>
    readGuides(storageKey, `xuui:${studyId}:guides:v1`),
  );
  const [active, setActive] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [elementBounds, setElementBounds] = useState<Bounds[]>([]);
  const [snappedBox, setSnappedBox] = useState<number | null>(null);
  const dragBounds = useRef<Bounds[]>([]);
  const drag = useRef<Drag | null>(null);
  const guideElements = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (dragging) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(guides));
    } catch {
      /* Guides remain usable without browser storage. */
    }
  }, [guides, dragging, storageKey]);

  const limit = (axis: Axis) => ({
    min: -geometry.origin[axis] / geometry.scale,
    max:
      ((axis === 'x' ? geometry.width : geometry.height) -
        geometry.origin[axis]) /
      geometry.scale,
  });
  const remove = (id: string) => {
    setGuides((previous) => previous.filter((guide) => guide.id !== id));
    setEditing(null);
    setActive(null);
  };
  const positionAt = (
    axis: Axis,
    event: { clientX: number; clientY: number },
  ) => {
    const bounds = container.current!.getBoundingClientRect();
    const value =
      ((axis === 'x'
        ? event.clientX - bounds.left
        : event.clientY - bounds.top) -
        geometry.origin[axis]) /
      geometry.scale;
    const range = limit(axis);
    return Math.min(range.max, Math.max(range.min, Math.round(value)));
  };
  const dragPosition = (
    current: Drag,
    event: { clientX: number; clientY: number },
    feedback = true,
  ) => {
    const range = limit(current.axis);
    const delta =
      current.axis === 'x'
        ? event.clientX - current.x
        : event.clientY - current.y;
    const raw = current.created
      ? positionAt(current.axis, event)
      : Math.max(
          range.min,
          Math.min(
            range.max,
            current.original + Math.round(delta / geometry.scale),
          ),
        );
    let nearest = raw;
    let distance = 6 / geometry.scale;
    let matched: number | null = null;
    dragBounds.current.forEach((box, index) => {
      const start =
        ((current.axis === 'x' ? box.x : box.y) -
          geometry.origin[current.axis]) /
        geometry.scale;
      const length =
        (current.axis === 'x' ? box.width : box.height) / geometry.scale;
      for (const position of [start, start + length / 2, start + length]) {
        const difference = Math.abs(position - raw);
        if (
          difference < distance &&
          position >= range.min &&
          position <= range.max
        ) {
          distance = difference;
          nearest = Math.round(position * 100) / 100;
          matched = index;
        }
      }
    });
    if (feedback) setSnappedBox(matched);
    return nearest;
  };
  const setPosition = (id: string, position: number) =>
    setGuides((previous) =>
      previous.map((guide) =>
        guide.id === id && guide.position !== position
          ? { ...guide, position }
          : guide,
      ),
    );
  const openEditor = (id: string, clientX: number, clientY: number) => {
    const bounds = container.current!.getBoundingClientRect();
    setActive(id);
    setEditing({
      id,
      x: Math.max(8, Math.min(bounds.width - 176, clientX - bounds.left + 12)),
      y: Math.max(24, Math.min(bounds.height - 52, clientY - bounds.top + 12)),
    });
  };
  const restoreFocus = (id: string) =>
    requestAnimationFrame(() =>
      guideElements.current.get(id)?.focus({ preventScroll: true }),
    );

  function beginDrag(
    event: PointerEvent<HTMLElement>,
    axis: Axis,
    existing?: Guide,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setEditing(null);
    const seen = new Set<string>();
    const boxes =
      designRef.current && container.current
        ? [designRef.current, ...designRef.current.querySelectorAll('*')]
            .filter(
              (element) =>
                !(element instanceof SVGElement) ||
                element.tagName.toLowerCase() === 'svg',
            )
            .map((element) => relativeBounds(element, container.current!))
            .filter((box) => {
              if (box.width <= 0 || box.height <= 0) return false;
              const key = `${box.x},${box.y},${box.width},${box.height}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
        : [];
    dragBounds.current = boxes;
    setElementBounds(boxes);
    setSnappedBox(null);
    const guide = existing ?? {
      id: crypto.randomUUID(),
      axis,
      position: positionAt(axis, event),
    };
    if (!existing) setGuides((previous) => [...previous, guide]);
    drag.current = {
      id: guide.id,
      axis,
      original: guide.position,
      created: !existing,
      moved: false,
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      control: event.currentTarget,
    };
    setActive(guide.id);
    setDragging(guide.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.moved ||=
      Math.hypot(event.clientX - current.x, event.clientY - current.y) >= 3;
    if (current.moved) setPosition(current.id, dragPosition(current, event));
  }

  function finishDrag(event: PointerEvent) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const area = container.current!.getBoundingClientRect();
    const outside =
      event.clientX < area.left ||
      event.clientX > area.right ||
      event.clientY < area.top ||
      event.clientY > area.bottom;
    drag.current = null;
    setDragging(null);
    setSnappedBox(null);
    if (current.control.hasPointerCapture(event.pointerId))
      current.control.releasePointerCapture(event.pointerId);
    if (outside || (current.created && !current.moved)) {
      remove(current.id);
      return;
    }
    if (!current.created && !current.moved)
      openEditor(current.id, event.clientX, event.clientY);
    else {
      setPosition(current.id, dragPosition(current, event, false));
      restoreFocus(current.id);
    }
  }

  const cancelDrag = useCallback(() => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    setDragging(null);
    setSnappedBox(null);
    setGuides((previous) =>
      current.created
        ? previous.filter((guide) => guide.id !== current.id)
        : previous.map((guide) =>
            guide.id === current.id
              ? { ...guide, position: current.original }
              : guide,
          ),
    );
    if (current.created) {
      setEditing(null);
      setActive(null);
    }
    if (current.control.hasPointerCapture(current.pointerId))
      current.control.releasePointerCapture(current.pointerId);
  }, []);

  useEffect(() => {
    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) {
        event.preventDefault();
        cancelDrag();
      }
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [cancelDrag]);

  function createWithKeyboard(event: KeyboardEvent, axis: Axis) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const guide = { id: crypto.randomUUID(), axis, position: 0 };
    setGuides((previous) => [...previous, guide]);
    const bounds = container.current!.getBoundingClientRect();
    openEditor(
      guide.id,
      bounds.left + geometry.origin.x,
      bounds.top + geometry.origin.y,
    );
  }

  function guideKey(event: KeyboardEvent, guide: Guide) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();
      openEditor(
        guide.id,
        bounds.left + (guide.axis === 'x' ? 6 : 36),
        bounds.top + (guide.axis === 'y' ? 6 : 36),
      );
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      remove(guide.id);
    } else if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      const direction =
        event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      const range = limit(guide.axis);
      setPosition(
        guide.id,
        Math.max(
          range.min,
          Math.min(
            range.max,
            guide.position + direction * (event.shiftKey ? 10 : 1),
          ),
        ),
      );
    }
  }

  const edited = editing && guides.find((guide) => guide.id === editing.id);
  return (
    <div
      ref={container}
      data-workspace-control
      data-guide-drag={dragging ? drag.current?.axis : undefined}
      role="group"
      aria-label="Canvas rulers and guides"
      className={cn(
        'workspace-rulers pointer-events-none absolute inset-0',
        dragging && 'is-dragging-guide',
      )}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={cancelDrag}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        {selectionEnabled && (
          <CanvasSelection
            designRef={designRef}
            surfaceRef={container}
            geometry={geometry}
            selection={selection}
            onSelect={onSelect}
            onInspect={onInspect}
          />
        )}
        {dragging &&
          elementBounds.map((box, index) => (
            <div
              key={index}
              aria-hidden="true"
              data-element-bound
              data-snapped={index === snappedBox || undefined}
              className={cn(
                'element-bound absolute',
                index === snappedBox && 'is-snap-target',
              )}
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
              }}
            />
          ))}
        {(guideFade.mounted ? guides : []).map((guide) => {
          const position =
            geometry.origin[guide.axis] + guide.position * geometry.scale;
          const range = limit(guide.axis);
          if (
            position < 0 ||
            position > (guide.axis === 'x' ? geometry.width : geometry.height)
          )
            return null;
          return (
            <div
              key={guide.id}
              ref={(element) => {
                if (element) guideElements.current.set(guide.id, element);
                else guideElements.current.delete(guide.id);
              }}
              role="slider"
              tabIndex={0}
              aria-label={`${guide.axis.toUpperCase()} guide`}
              aria-valuenow={guide.position}
              aria-valuemin={range.min}
              aria-valuemax={range.max}
              aria-orientation={guide.axis === 'x' ? 'horizontal' : 'vertical'}
              data-guide-id={guide.id}
              className={cn(
                'workspace-guide pointer-events-auto absolute touch-none select-none outline-none transition-opacity duration-200 ease-out motion-reduce:transition-none',
                !guideFade.shown && 'pointer-events-none opacity-0',
                guide.axis === 'x'
                  ? 'inset-y-0 w-[11px] cursor-ew-resize'
                  : 'inset-x-0 h-[11px] cursor-ns-resize',
              )}
              style={
                guide.axis === 'x'
                  ? { left: position - 5 }
                  : { top: position - 5 }
              }
              onPointerDown={(event) => beginDrag(event, guide.axis, guide)}
              onKeyDown={(event) => guideKey(event, guide)}
              onFocus={() => setActive(guide.id)}
              onClick={(event) => {
                if (event.detail === 0) {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  openEditor(guide.id, bounds.left + 24, bounds.top + 24);
                }
              }}
            >
              <span
                data-guide-line
                className={cn(
                  'guide-stroke absolute',
                  guide.axis === 'x'
                    ? 'inset-y-0 left-[5px] w-px'
                    : 'inset-x-0 top-[5px] h-px',
                )}
              />
              {active === guide.id && !editing && (
                <span
                  className={cn(
                    'guide-coordinate absolute whitespace-nowrap rounded-sm px-1.5 py-1 font-mono text-[10px] leading-none',
                    guide.axis === 'x' ? 'top-7 left-3' : 'top-3 left-7',
                  )}
                >
                  {guide.axis.toUpperCase()} {guide.position}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {rulers.mounted && (
        <div
          data-rulers
          className={cn(
            'pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out motion-reduce:transition-none',
            rulers.shown ? 'opacity-100' : 'opacity-0',
          )}
          inert={!visible}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <button
              type="button"
              aria-label="Top ruler: drag to add a horizontal guide"
              title="Drag to add a horizontal guide"
              className="pointer-events-auto absolute inset-x-0 top-0 h-6 cursor-ns-resize touch-none"
              onPointerDown={(event) => beginDrag(event, 'y')}
              onKeyDown={(event) => createWithKeyboard(event, 'y')}
            />
            <button
              type="button"
              aria-label="Left ruler: drag to add a vertical guide"
              title="Drag to add a vertical guide"
              className="pointer-events-auto absolute inset-y-6 left-0 w-6 cursor-ew-resize touch-none"
              onPointerDown={(event) => beginDrag(event, 'x')}
              onKeyDown={(event) => createWithKeyboard(event, 'x')}
            />
          </div>
          <RulerMarks
            width={geometry.width}
            height={geometry.height}
            origin={geometry.origin}
            scale={geometry.scale}
            step={rulerStep(geometry.scale)}
            labels={(axis) =>
              rulerLabels(
                axis === 'x' ? geometry.width : geometry.height,
                geometry.origin[axis],
                geometry.scale,
              )
            }
          />
        </div>
      )}
      {guidesVisible && edited && editing && (
        <GuideEditor
          key={edited.id}
          axis={edited.axis}
          position={edited.position}
          min={limit(edited.axis).min}
          max={limit(edited.axis).max}
          x={editing.x}
          y={editing.y}
          onPreview={(value) => setPosition(edited.id, value)}
          onRemove={() => {
            remove(edited.id);
            container.current?.parentElement
              ?.querySelector('main')
              ?.focus({ preventScroll: true });
          }}
          onCommit={(value) => {
            setPosition(edited.id, value);
            setEditing(null);
            restoreFocus(edited.id);
          }}
        />
      )}
    </div>
  );
}
