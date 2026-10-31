import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  measureBetween,
  relativeBounds,
  renderedLayers,
} from './workspaceGeometry';
import type { Bounds, WorkspaceGeometry } from './workspaceGeometry';
import { MeasurementLines } from './MeasurementLines';
import { MeasurementOverview } from './MeasurementOverview';

type SelectionBounds = {
  selected: Bounds;
  elements: Bounds[];
  target: Bounds | null;
};
const combinedBounds = (boxes: Bounds[]): Bounds => {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((box) => box.x + box.width)) - x,
    height: Math.max(...boxes.map((box) => box.y + box.height)) - y,
  };
};
const sameBounds = (a: Bounds | null, b: Bounds | null) =>
  a?.x === b?.x &&
  a?.y === b?.y &&
  a?.width === b?.width &&
  a?.height === b?.height;
const px = (value: number) => Math.round(value * 10) / 10;

export function CanvasSelection({
  designRef,
  surfaceRef,
  geometry,
}: {
  designRef: RefObject<HTMLDivElement | null>;
  surfaceRef: RefObject<HTMLDivElement | null>;
  geometry: WorkspaceGeometry;
}) {
  const [selection, setSelection] = useState<Element[]>([]);
  const selected = selection[0] ?? null;
  const [target, setTarget] = useState<Element | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [bounds, setBounds] = useState<SelectionBounds | null>(null);
  const selectedRef = useRef<Element[]>([]);
  const hoveredRef = useRef<Element | null>(null);
  const optionHeld = useRef(false);

  useEffect(() => {
    const workspace = surfaceRef.current?.parentElement;
    if (!workspace) return;
    const choose = (elements: Element[]) => {
      selectedRef.current = elements;
      setSelection(elements);
      setTarget(null);
    };
    const elementAt = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null;
      if (
        !element ||
        !designRef.current?.contains(element) ||
        element === designRef.current
      )
        return null;
      return element instanceof SVGElement
        ? (element.closest('svg') ?? element)
        : element;
    };
    const blockInteraction = (event: PointerEvent) => {
      if (workspace.dataset.panMode === 'true') return;
      if (event.button !== 0 || !elementAt(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const click = (event: MouseEvent) => {
      if (
        workspace.dataset.panMode === 'true' ||
        workspace.dataset.panSuppressClick === 'true'
      )
        return;
      if (event.button !== 0) return;
      const element = elementAt(event);
      if (!element) {
        if (
          event.target instanceof Element &&
          !event.target.closest('[data-workspace-control]')
        ) {
          choose([]);
        }
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if ((event.altKey || optionHeld.current) && selectedRef.current.length) {
        setMeasuring(true);
        setTarget(selectedRef.current.includes(element) ? null : element);
      } else {
        choose([element]);
        workspace.querySelector('main')?.focus({ preventScroll: true });
      }
    };
    const move = (event: PointerEvent) => {
      const element = elementAt(event);
      hoveredRef.current = element;
      if ((event.altKey || optionHeld.current) && selectedRef.current.length) {
        setMeasuring(true);
        setTarget(
          element && selectedRef.current.includes(element) ? null : element,
        );
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest('input, textarea, select')))
      )
        return;
      if (event.key === 'Alt') {
        optionHeld.current = true;
        setMeasuring(true);
        setTarget(
          hoveredRef.current && selectedRef.current.includes(hoveredRef.current)
            ? null
            : hoveredRef.current,
        );
        if (selectedRef.current.length) event.preventDefault();
      }
      if (
        event.key === 'Tab' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !(
          event.target instanceof Element &&
          event.target.closest(
            'aside, [data-workspace-control], [data-slot="select-content"]',
          )
        )
      ) {
        const layers = renderedLayers(designRef.current);
        if (layers.length) {
          event.preventDefault();
          const current = selectedRef.current[0]
            ? layers.indexOf(selectedRef.current[0])
            : -1;
          const index =
            current < 0
              ? event.shiftKey
                ? layers.length - 1
                : 0
              : (current + (event.shiftKey ? -1 : 1) + layers.length) %
                layers.length;
          choose([layers[index]]);
          workspace.querySelector('main')?.focus({ preventScroll: true });
        }
      }
      if (
        event.key === 'Enter' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        selectedRef.current.length &&
        !(
          event.target instanceof Element &&
          event.target.closest(
            'aside, [data-workspace-control], [data-slot="select-content"]',
          )
        )
      ) {
        event.preventDefault();
        const current = selectedRef.current;
        if (event.shiftKey) {
          let parent = current[0].parentElement;
          while (
            parent &&
            parent !== designRef.current &&
            !current.every((element) => parent!.contains(element))
          )
            parent = parent.parentElement;
          if (
            parent &&
            parent !== designRef.current &&
            designRef.current?.contains(parent)
          )
            choose([parent]);
        } else {
          const children = current.flatMap((element) =>
            element instanceof SVGElement
              ? []
              : renderedLayers(element).filter(
                  (child) => child.parentElement === element,
                ),
          );
          if (children.length) choose(children);
        }
        workspace.querySelector('main')?.focus({ preventScroll: true });
      }
      if (event.key === 'Escape') {
        choose([]);
      }
    };
    const release = () => {
      optionHeld.current = false;
      setMeasuring(false);
      setTarget(null);
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.key === 'Alt') release();
    };
    const leave = () => {
      hoveredRef.current = null;
      setTarget(null);
    };
    workspace.addEventListener('pointerdown', blockInteraction, true);
    workspace.addEventListener('click', click, true);
    workspace.addEventListener('pointermove', move);
    workspace.addEventListener('pointerleave', leave);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', release);
    return () => {
      workspace.removeEventListener('pointerdown', blockInteraction, true);
      workspace.removeEventListener('click', click, true);
      workspace.removeEventListener('pointermove', move);
      workspace.removeEventListener('pointerleave', leave);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', release);
    };
  }, [designRef, surfaceRef]);

  useEffect(() => {
    if (!selected) {
      setBounds(null);
      return;
    }
    let frame = 0;
    const update = () => {
      if (selection.some((element) => !element.isConnected)) {
        selectedRef.current = [];
        setSelection([]);
        return;
      }
      if (surfaceRef.current) {
        const elements = selection.map((element) =>
          relativeBounds(element, surfaceRef.current!),
        );
        const next = {
          selected: combinedBounds(elements),
          elements,
          target:
            measuring && target?.isConnected
              ? relativeBounds(target, surfaceRef.current)
              : null,
        };
        setBounds((previous) =>
          previous &&
          sameBounds(previous.selected, next.selected) &&
          previous.elements.length === next.elements.length &&
          previous.elements.every((box, index) =>
            sameBounds(box, next.elements[index]),
          ) &&
          sameBounds(previous.target, next.target)
            ? previous
            : next,
        );
      }
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [selection, selected, target, measuring, surfaceRef]);

  if (!selected)
    return measuring ? (
      <MeasurementOverview
        designRef={designRef}
        surfaceRef={surfaceRef}
        scale={geometry.scale}
      />
    ) : null;
  if (!bounds) return null;
  const box = bounds.selected;
  const tag = selected.tagName.toLowerCase();
  const name = (
    selected.getAttribute('aria-label') ??
    selected.textContent ??
    ''
  )
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
  const distances =
    measuring && bounds.target ? measureBetween(box, bounds.target) : [];
  return (
    <div
      className="canvas-selection pointer-events-none absolute inset-0"
      role="status"
      aria-label="Selected element"
      data-selection-count={selection.length}
    >
      <span className="sr-only">
        {selection.length === 1
          ? `Selected ${tag} ${name}`
          : `Selected ${selection.length} layers`}
        , X {px((box.x - geometry.origin.x) / geometry.scale)}, Y{' '}
        {px((box.y - geometry.origin.y) / geometry.scale)}.
      </span>
      {bounds.elements.map((element, index) => (
        <div
          key={index}
          data-selected-tag={selection[index]?.tagName.toLowerCase()}
          className="selection-outline absolute"
          style={{
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
          }}
        />
      ))}
      <span
        className="selection-label absolute mt-1 -translate-x-1/2 whitespace-nowrap rounded-sm px-1.5 py-1 text-[11px] leading-4"
        style={{ left: box.x + box.width / 2, top: box.y + box.height }}
      >
        {px(box.width / geometry.scale)} × {px(box.height / geometry.scale)}
      </span>
      {measuring && bounds.target && (
        <div
          className="measurement-target absolute"
          style={{
            left: bounds.target.x,
            top: bounds.target.y,
            width: bounds.target.width,
            height: bounds.target.height,
          }}
        />
      )}
      {measuring &&
        bounds.target &&
        distances.some((distance) => distance.axis === 'y') &&
        [box.x, box.x + box.width].map((x) => (
          <span
            key={`witness-x-${x}`}
            aria-hidden="true"
            className="measurement-witness absolute w-px"
            style={{
              left: x,
              top: Math.min(box.y, bounds.target!.y),
              height:
                Math.max(
                  box.y + box.height,
                  bounds.target!.y + bounds.target!.height,
                ) - Math.min(box.y, bounds.target!.y),
            }}
          />
        ))}
      {measuring &&
        bounds.target &&
        distances.some((distance) => distance.axis === 'x') &&
        [box.y, box.y + box.height].map((y) => (
          <span
            key={`witness-y-${y}`}
            aria-hidden="true"
            className="measurement-witness absolute h-px"
            style={{
              top: y,
              left: Math.min(box.x, bounds.target!.x),
              width:
                Math.max(
                  box.x + box.width,
                  bounds.target!.x + bounds.target!.width,
                ) - Math.min(box.x, bounds.target!.x),
            }}
          />
        ))}
      <MeasurementLines distances={distances} scale={geometry.scale} />
    </div>
  );
}
