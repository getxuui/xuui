import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { layerKind, layerName } from './layerIdentity';
import type { LayerKind } from './layerIdentity';
import { renderedLayers } from './workspaceGeometry';

export type LayerNode = {
  id: string;
  variantId: string;
  name: string;
  kind: LayerKind;
  elements: Element[];
  children: LayerNode[];
};

/** Read the same visible DOM layers used by canvas selection. */
export function useLayerTree(
  canvas: RefObject<HTMLElement | null>,
  variantIds: string[],
) {
  const [tree, setTree] = useState<LayerNode[]>([]);
  const ids = useRef(new WeakMap<Element, string>());
  const nextId = useRef(0);
  useLayoutEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    let frame = 0;
    let disposed = false;
    let previous = '';
    const update = () => {
      const roots: LayerNode[] = [];
      surface
        .querySelectorAll<HTMLElement>('[data-variant-id]')
        .forEach((variant) => {
          const design = variant.querySelector('[data-xuui-design]');
          const variantId = variant.dataset.variantId!;
          const nodes = new Map<Element, LayerNode>();
          const children: LayerNode[] = [];
          renderedLayers(design).forEach((element) => {
            if (!ids.current.has(element))
              ids.current.set(element, `layer-${++nextId.current}`);
            const node: LayerNode = {
              id: ids.current.get(element)!,
              variantId,
              name: layerName(element),
              kind: layerKind(element),
              elements: [element],
              children: [],
            };
            nodes.set(element, node);
            let parent = element.parentElement;
            while (parent && parent !== design && !nodes.has(parent))
              parent = parent.parentElement;
            const group = parent && nodes.get(parent);
            (group ? group.children : children).push(node);
          });
          if (children.length === 1) roots.push(children[0]);
          else if (children.length)
            roots.push({
              id: `variant-${variantId}`,
              variantId,
              name: variant.dataset.variantName ?? 'Variant',
              kind: 'group',
              elements: children.flatMap((node) => node.elements),
              children,
            });
        });
      const fingerprint = JSON.stringify(roots, (key, value) =>
        key === 'elements' ? undefined : value,
      );
      if (fingerprint !== previous) {
        previous = fingerprint;
        setTree(roots);
      }
    };
    const schedule = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new MutationObserver((records) => {
      if (
        records.some((record) =>
          (record.target instanceof Element
            ? record.target
            : record.target.parentElement
          )?.closest('[data-xuui-design]'),
        )
      )
        schedule();
    });
    observer.observe(surface, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'hidden',
        'aria-label',
        'alt',
        'data-xuui-layer-name',
      ],
    });
    window.addEventListener('resize', schedule);
    document.fonts.ready.then(schedule);
    update();
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, [canvas, variantIds]);
  return tree;
}
