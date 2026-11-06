import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { usePanelRef } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { MaskedMarquee } from './MaskedMarquee';
import { layerIcons } from './layerIdentity';
import type { LayerNode } from './useLayerTree';

/** Height of the collapsed Layers bar; h-10 in the markup. */
const collapsedBarHeight = 40;

export function LayerPanel({
  tree,
  selection,
  onSelect,
  studyControls,
  onCanvasFocus,
  focusRequest,
}: {
  tree: LayerNode[];
  selection: Element[];
  onSelect: (node: LayerNode) => void;
  studyControls: ReactNode;
  onCanvasFocus: () => void;
  focusRequest: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const panel = usePanelRef();
  const reopen = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<'collapse' | 'expand' | null>(null);
  const container = useRef<HTMLUListElement>(null);
  const handledFocus = useRef(0);
  const rootIds = tree.map((node) => node.id).join('|');
  const nodes = useMemo(() => {
    const flat: LayerNode[] = [];
    const visit = (items: LayerNode[]) =>
      items.forEach((node) => {
        flat.push(node);
        visit(node.children);
      });
    visit(tree);
    return flat;
  }, [tree]);
  useEffect(() => {
    // One variant opens its tree; several (All) start as one row each.
    const roots = rootIds ? rootIds.split('|') : [];
    setExpanded(new Set(roots.length > 1 ? [] : roots));
  }, [rootIds]);
  useEffect(() => {
    if (!selection.length) return;
    const ancestors: string[] = [];
    const visit = (items: LayerNode[], path: string[]): boolean =>
      items.some((node) => {
        if (
          node.elements.length === 1 &&
          selection.includes(node.elements[0])
        ) {
          ancestors.push(...path);
          return true;
        }
        return visit(node.children, [...path, node.id]);
      });
    visit(tree, []);
    setExpanded((previous) => new Set([...previous, ...ancestors]));
    const active = nodes.find(
      (node) => node.elements.length === 1 && node.elements[0] === selection[0],
    );
    if (active) {
      const ownsFocus =
        container.current?.contains(document.activeElement) &&
        document.activeElement?.matches('[role="treeitem"]');
      setFocused(active.id);
      const frame = requestAnimationFrame(() => {
        const item = container.current?.querySelector<HTMLElement>(
          `[data-layer-id="${active.id}"]`,
        );
        // A queued selection update must not take focus back after Escape.
        if (ownsFocus && container.current?.contains(document.activeElement))
          item?.focus({ preventScroll: true });
        item?.scrollIntoView({ block: 'nearest' });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [selection, tree, nodes, focusRequest]);

  const visible: { node: LayerNode; parent?: LayerNode }[] = [];
  const visitVisible = (items: LayerNode[], parent?: LayerNode) =>
    items.forEach((node) => {
      visible.push({ node, parent });
      if (expanded.has(node.id)) visitVisible(node.children, node);
    });
  visitVisible(tree);
  const tabStop = visible.some(({ node }) => node.id === focused)
    ? focused
    : visible[0]?.node.id;
  useEffect(() => {
    if (collapsed && pendingFocus.current === 'collapse') {
      reopen.current?.focus({ preventScroll: true });
      pendingFocus.current = null;
    } else if (!collapsed && pendingFocus.current === 'expand') {
      container.current
        ?.querySelector<HTMLElement>(`[data-layer-id="${tabStop}"]`)
        ?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [collapsed, tabStop]);
  useEffect(() => {
    if (!focusRequest || handledFocus.current === focusRequest || !tabStop)
      return;
    if (collapsed) {
      panel.current?.expand();
      return;
    }
    const selectedId = nodes.find(
      (node) => node.elements.length === 1 && node.elements[0] === selection[0],
    )?.id;
    const item = container.current?.querySelector<HTMLElement>(
      `[data-layer-id="${selectedId ?? tabStop}"]`,
    );
    if (!item) return;
    item.focus({ preventScroll: true });
    item.scrollIntoView({ block: 'nearest' });
    handledFocus.current = focusRequest;
  }, [focusRequest, tabStop, nodes, selection, collapsed, panel]);
  const toggle = (id: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const choose = (node: LayerNode) => {
    setFocused(node.id);
    onSelect(node);
    container.current
      ?.querySelector<HTMLElement>(`[data-layer-id="${node.id}"]`)
      ?.focus({ preventScroll: true });
  };
  const keydown = (event: KeyboardEvent, node: LayerNode) => {
    if (
      event.nativeEvent.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const index = visible.findIndex((item) => item.node.id === node.id);
    let next: LayerNode | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = visible[index + 1]?.node;
        break;
      case 'ArrowUp':
        next = visible[index - 1]?.node;
        break;
      case 'Home':
        next = visible[0]?.node;
        break;
      case 'End':
        next = visible.at(-1)?.node;
        break;
      case 'ArrowRight':
        if (node.children.length && !expanded.has(node.id)) toggle(node.id);
        else
          next =
            visible[index + 1]?.parent === node
              ? visible[index + 1].node
              : undefined;
        break;
      case 'ArrowLeft':
        if (node.children.length && expanded.has(node.id)) toggle(node.id);
        else next = visible[index]?.parent;
        break;
      case 'Enter':
        // Selected layers use the canvas hierarchy shortcuts in both surfaces.
        if (node.elements.some((element) => selection.includes(element)))
          return;
        next = node;
        break;
      case ' ':
        next = node;
        break;
      case 'Tab': {
        const siblings = visible[index]?.parent?.children ?? tree;
        const selected = siblings.filter(
          (sibling) =>
            sibling.elements.length === 1 &&
            selection.includes(sibling.elements[0]),
        );
        const anchor =
          selected.length > 1
            ? event.shiftKey
              ? selected[0]
              : selected.at(-1)!
            : node;
        const current = siblings.indexOf(anchor);
        next =
          siblings[
            (current + (event.shiftKey ? -1 : 1) + siblings.length) %
              siblings.length
          ];
        break;
      }
      case 'Escape':
        // Returning focus preserves the layer selection.
        event.preventDefault();
        event.stopPropagation();
        onCanvasFocus();
        return;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (next) choose(next);
  };
  const render = (items: LayerNode[], depth = 0) =>
    items.map((node) => {
      const open = expanded.has(node.id);
      const selected =
        node.elements.length === 1 && selection.includes(node.elements[0]);
      const Icon = layerIcons[node.kind];
      return (
        <li
          key={node.id}
          role="treeitem"
          aria-label={node.name}
          aria-selected={selected}
          aria-expanded={node.children.length ? open : undefined}
          tabIndex={node.id === tabStop ? 0 : -1}
          data-layer-id={node.id}
          data-marquee-host
          className="layer-tree-item outline-none"
          onFocus={(event) => {
            if (event.target === event.currentTarget) setFocused(node.id);
          }}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget) keydown(event, node);
          }}
        >
          <div
            className={cn(
              'layer-tree-row flex h-7 min-w-0 cursor-default items-center gap-1 rounded-md pe-2 text-xs',
              selected && 'is-selected',
            )}
            style={{ paddingInlineStart: depth * 12 }}
            onClick={(event) => {
              event.stopPropagation();
              choose(node);
            }}
          >
            {node.children.length ? (
              <Button
                variant="ghost"
                size="icon-xs"
                tabIndex={-1}
                // Pull the icon in by the button's empty side, keeping the
                // full hit area.
                className="-me-1"
                aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(node.id);
                  event.currentTarget
                    .closest<HTMLElement>('[role="treeitem"]')
                    ?.focus({ preventScroll: true });
                }}
              >
                <ChevronRight
                  data-icon="inline-start"
                  className={cn(
                    'transition-transform rtl:rotate-180',
                    open && 'rotate-90 rtl:rotate-90',
                  )}
                />
              </Button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <Icon
              aria-hidden="true"
              size={14}
              strokeWidth={1.6}
              className="layer-tree-icon shrink-0 text-muted-foreground"
            />
            <MaskedMarquee text={node.name} />
          </div>
          {open && node.children.length > 0 && (
            <ul role="group" className="mt-0.5 flex flex-col gap-0.5">
              {render(node.children, depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  return (
    <aside
      data-workspace-control
      data-layer-panel
      aria-label="Layers"
      className="studio-chrome flex h-full min-w-0 flex-col bg-studio-background"
    >
      <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
        <ResizablePanel
          id="pages"
          defaultSize={304}
          minSize={124}
          groupResizeBehavior="preserve-pixel-size"
        >
          <section aria-label="Pages" className="h-full min-h-0 px-4 pt-2">
            {studyControls}
          </section>
        </ResizablePanel>
        <ResizableHandle
          aria-label="Resize pages and layers"
          className="bg-transparent before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-border after:h-2"
        />
        <ResizablePanel
          id="layer-tree"
          minSize={96}
          collapsible
          // Collapsed, the panel keeps room for its reopen bar, so the group's
          // height never changes and expanding doesn't flicker the divider.
          collapsedSize={collapsedBarHeight}
          panelRef={panel}
          onResize={(size) => setCollapsed(size.inPixels <= collapsedBarHeight)}
        >
          {collapsed && (
            <div className="flex h-10 items-center px-4">
              <Button
                ref={reopen}
                variant="ghost"
                size="xs"
                className="w-full justify-between"
                aria-label="Expand layer panel"
                aria-expanded={false}
                aria-controls="component-layers"
                onClick={() => {
                  pendingFocus.current = 'expand';
                  panel.current?.expand();
                }}
              >
                Layers
                <ChevronUp data-icon="inline-end" />
              </Button>
            </div>
          )}
          <section
            hidden={collapsed}
            className={cn(
              'h-full min-h-0 flex-col gap-2 px-4 pt-2 pb-2',
              !collapsed && 'flex',
            )}
          >
            <header className="flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-medium text-muted-foreground">
                Layers
              </h2>
              <Button
                variant="ghost"
                size="icon-xs"
                className="layer-panel-toggle"
                aria-label="Collapse layer panel"
                aria-expanded={!collapsed}
                aria-controls="component-layers"
                onClick={() => {
                  pendingFocus.current = 'collapse';
                  panel.current?.collapse();
                }}
              >
                <ChevronDown data-icon="inline-start" />
              </Button>
            </header>
            <div className="sidebar-scroll-mask min-h-0 flex-1 overflow-auto overscroll-contain pb-3">
              <ul
                ref={container}
                id="component-layers"
                role="tree"
                aria-label="Component layers"
                aria-keyshortcuts="L"
                aria-multiselectable="true"
                className="flex flex-col gap-0.5"
              >
                {render(tree)}
              </ul>
              {!visible.length && (
                <p className="px-3 py-6 text-xs text-muted-foreground">
                  No layers to show
                </p>
              )}
            </div>
          </section>
        </ResizablePanel>
      </ResizablePanelGroup>
    </aside>
  );
}
