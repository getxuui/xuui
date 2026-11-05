import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Comment, Study, Variant } from './model';
import { useStudioTheme } from './useStudioTheme';
import { WorkspaceRulers } from './WorkspaceRulers';
import { useParameters } from './useParameters';
import { ParameterPanel } from './ParameterPanel';
import { CanvasViewport } from './CanvasViewport';
import { VariantSurface } from './VariantSurface';
import { ViewSettings } from './GridControls';
import { useGrids } from './useGrids';
import { CanvasFeedback, CanvasTools, CommentEditor } from './CanvasFeedback';
import type { CanvasMode } from './CanvasFeedback';
import { ReviewPanel } from './ReviewPanel';
import { findCommentElement } from './feedback';
import { useReviews } from './useReviews';
import type { LayerProperties } from './layerProperties';
import { LayerPanel } from './LayerPanel';
import { useLayerTree } from './useLayerTree';
import { useNewVariants } from './useNewVariants';
import {
  lineageColumns,
  lineageEdges,
  lineagePlacements,
  postedComments,
} from './lineage';
import { LineageMap } from './LineageMap';
import type { LayerNode } from './useLayerTree';
import { StudyControls } from './StudyControls';
import { VariantLabel } from './VariantLabel';
import { z } from 'zod';
import { commentSchema } from './model';
import { selectorFor } from './feedback';
import { readSession, writeSession, useSessionState } from './sessionState';
import type { VariantProgress } from './variantProgress';
import { VariantSpinner } from './VariantSpinner';

const editorCommentSchema = commentSchema.extend({
  body: z.string().max(4000),
});
const emptyDesign = () => null;

export default function Preview({
  study,
  progress,
  variantId,
  layerSelectors,
  onVariantChange,
  allVariants,
  onAllVariantsChange,
  studies,
  onStudyChange,
}: {
  study: Study;
  progress: VariantProgress[];
  variantId: string;
  layerSelectors: string[] | null;
  onVariantChange: (id: string, focus?: boolean) => void;
  allVariants: boolean;
  onAllVariantsChange: (all: boolean) => void;
  studies: Study[];
  onStudyChange: (id: string) => void;
}) {
  const pendingVariants = useMemo(
    () =>
      progress.filter(
        (item) =>
          item.studyId === study.id &&
          !study.variants.some((variant) => variant.id === item.variantId),
      ),
    [progress, study],
  );
  const canvasVariants = useMemo<Variant[]>(
    () => [
      ...study.variants,
      ...pendingVariants.map((item) => ({
        id: item.variantId,
        name: item.name,
        from: item.from.filter((id) =>
          study.variants.some((variant) => variant.id === id),
        ),
        description: 'The agent is working on this variant.',
        rationale: 'This artboard will update when the variant is ready.',
        component: emptyDesign,
        color: '',
      })),
    ],
    [study.variants, pendingVariants],
  );
  const workingVariantIds = useMemo(
    () => new Set(pendingVariants.map((item) => item.variantId)),
    [pendingVariants],
  );
  const variant = canvasVariants.find((item) => item.id === variantId);
  const isWorking = workingVariantIds.has(variantId);
  const design = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLElement>(null);
  const focusCanvas = useCallback(
    () => canvas.current?.querySelector('main')?.focus({ preventScroll: true }),
    [],
  );
  const returnLayersToCanvas = useRef(false);
  const layerFocusReturn = useRef(0);
  const layersTrigger = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useSessionState<CanvasMode>(
    'xuui:canvas-mode:v1',
    z.enum(['select', 'interact', 'comment']),
    'select',
  );
  const [selection, setSelection] = useState<Element[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<LayerProperties | null>(
    null,
  );
  const [storedPendingComment, setPendingComment] =
    useSessionState<Comment | null>(
      'xuui:comment-editor:v1',
      editorCommentSchema.nullable(),
      null,
    );
  const pendingComment =
    storedPendingComment &&
    study.variants.some((item) => item.id === storedPendingComment.variantId)
      ? storedPendingComment
      : null;
  const [requestedComment, setFocusedComment] = useState<Comment | null>(null);
  const selectCanvasLayers = useCallback((elements: Element[]) => {
    setFocusedComment(null);
    setSelection(elements);
  }, []);
  const [commentEditorDrafts, setCommentEditorDrafts] = useSessionState<
    Record<string, string>
  >('xuui:comment-editor-drafts:v1', z.record(z.string(), z.string()), {});
  const clearEditorDraft = (comment: Comment) =>
    setCommentEditorDrafts((previous) => {
      const next = { ...previous };
      delete next[commentDraftKey(comment)];
      return next;
    });
  const review = useReviews(studies, study);
  const focusedComment =
    requestedComment &&
    (review.comments.find((comment) => comment.id === requestedComment.id) ??
      review.reviews
        .flatMap((record) => record.comments)
        .find((comment) => comment.id === requestedComment.id) ??
      null);
  const parameters = useParameters(variant?.controls, variantId);
  const grids = useGrids(study.id);
  const [compactLayout, setCompactLayout] = useState(
    () => window.matchMedia('(max-width: 767px)').matches,
  );
  const [layersOpen, setLayersOpen] = useSessionState(
    'xuui:layers-open:v1',
    z.boolean(),
    true,
  );
  const [layersSheetOpen, setLayersSheetOpen] = useState(false);
  const [layerFocusRequest, setLayerFocusRequest] = useState(0);
  const openLayers = useCallback(() => {
    cancelAnimationFrame(layerFocusReturn.current);
    returnLayersToCanvas.current = false;
    if (compactLayout) setLayersSheetOpen(true);
    else setLayersOpen(true);
    setLayerFocusRequest((request) => request + 1);
  }, [compactLayout]);
  const leaveLayers = useCallback(() => {
    if (compactLayout && layersSheetOpen) {
      returnLayersToCanvas.current = true;
      setLayersSheetOpen(false);
    } else focusCanvas();
  }, [compactLayout, layersSheetOpen, focusCanvas]);
  useEffect(() => {
    const focusLayers = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'l' ||
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest(
              'input, textarea, select, [role="textbox"], [role="combobox"], [role="listbox"], [data-xuui-comment-editor]',
            )))
      )
        return;
      event.preventDefault();
      if (
        event.target instanceof Element &&
        event.target.closest('[data-layer-panel] [role="tree"]')
      ) {
        leaveLayers();
        return;
      }
      openLayers();
    };
    window.addEventListener('keydown', focusLayers);
    return () => window.removeEventListener('keydown', focusLayers);
  }, [openLayers, leaveLayers]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setCompactLayout(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem('xuui-sidebar') !== 'collapsed';
    } catch {
      return true;
    }
  });
  const [rulersVisible, setRulersVisible] = useState(() => {
    try {
      return localStorage.getItem('xuui-rulers') !== 'hidden';
    } catch {
      return true;
    }
  });
  useStudioTheme();

  const changeMode = (next: CanvasMode) => {
    setFocusedComment(null);
    setPendingComment(null);
    setMode(next);
  };
  const commentDraftKey = (comment: Comment) =>
    review.comments.some((item) => item.id === comment.id)
      ? comment.id
      : `${study.id}:${comment.variantId}:new`;
  const editComment = (comment: Comment) => {
    setMode('comment');
    setPendingComment({
      ...comment,
      body: commentEditorDrafts[commentDraftKey(comment)] ?? comment.body,
    });
  };
  const closeComment = () => {
    setPendingComment(null);
    canvas.current?.querySelector('main')?.focus({ preventScroll: true });
  };
  const editorContext = useRef(`${study.id}:${variantId}`);
  useEffect(() => {
    const context = `${study.id}:${variantId}`;
    if (editorContext.current !== context) setPendingComment(null);
    editorContext.current = context;
  }, [study.id, variantId]);
  useEffect(
    () =>
      setFocusedComment((comment) =>
        comment?.variantId === variantId ? comment : null,
      ),
    [study.id, variantId],
  );
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest(
              'input, textarea, select, [role="combobox"], [role="listbox"]',
            )))
      )
        return;
      const key = event.key.toLowerCase();
      if (key === 'c' || key === 'v' || (key === 'escape' && !pendingComment)) {
        event.preventDefault();
        setFocusedComment(null);
        setPendingComment(null);
        setMode(key === 'c' ? 'comment' : 'select');
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [pendingComment]);

  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      if (
        !['ArrowUp', 'ArrowDown'].includes(event.key) ||
        event.defaultPrevented ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest(
              'input, textarea, select, [role="tree"], [data-workspace-control][role="group"], [role="textbox"], [role="combobox"], [role="listbox"], [role="option"], [role="slider"], [role="spinbutton"], [role="separator"], [data-xuui-comment-editor]',
            )))
      )
        return;
      const index = canvasVariants.findIndex((item) => item.id === variantId);
      const next = canvasVariants[index + (event.key === 'ArrowDown' ? 1 : -1)];
      if (index < 0 || !next) return;
      event.preventDefault();
      onVariantChange(next.id);
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, [canvasVariants, variantId, onVariantChange]);

  useEffect(() => {
    document.title = `${variant?.name ?? 'Unknown variant'} · xuui`;
  }, [variant]);
  useEffect(() => {
    try {
      localStorage.setItem('xuui-sidebar', sidebarOpen ? 'open' : 'collapsed');
    } catch {
      /* Optional preference. */
    }
  }, [sidebarOpen]);
  useEffect(() => {
    try {
      localStorage.setItem('xuui-rulers', rulersVisible ? 'visible' : 'hidden');
    } catch {
      /* Optional preference. */
    }
  }, [rulersVisible]);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'r' ||
        allVariants ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest(
              'input, textarea, select, [role="textbox"], [role="combobox"], [role="listbox"]',
            )))
      )
        return;
      event.preventDefault();
      setRulersVisible((visible) => !visible);
    };
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, [allVariants]);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (
        // ⌘\ like design tools; ⌘B belongs to the browser's bookmarks bar.
        event.code !== 'Backslash' ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.repeat
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          event.target.closest('input, textarea, select'))
      )
        return;
      event.preventDefault();
      setSidebarOpen((open) => !open);
    };
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, []);

  useEffect(() => {
    setSelection((previous) => {
      const valid =
        mode === 'select'
          ? previous.filter((element) => design.current?.contains(element))
          : [];
      return valid.length === previous.length ? previous : valid;
    });
  }, [mode, variantId, study.id]);
  const visible = useMemo(
    () => (allVariants ? canvasVariants : variant ? [variant] : []),
    [allVariants, canvasVariants, variant],
  );
  const variantIds = useMemo(
    () => visible.map((variant) => variant.id),
    [visible],
  );
  const tree = useLayerTree(canvas, variantIds);
  const restoredLink = useRef<string[] | null>(null);
  const [reloadSelection] = useState(() =>
    (
      performance.getEntriesByType('navigation')[0] as
        PerformanceNavigationTiming | undefined
    )?.type === 'reload'
      ? readSession(
          `xuui:${study.id}:${variantId}:selection:v1`,
          z.array(z.string()),
          [],
        )
      : [],
  );
  const restoreSelectors = layerSelectors ?? reloadSelection;
  useEffect(() => {
    if (restoredLink.current === restoreSelectors) return;
    if (!restoreSelectors.length) {
      restoredLink.current = restoreSelectors;
      if (layerSelectors !== null) setSelection([]);
      return;
    }
    const available = new Set<Element>();
    const collect = (nodes: LayerNode[]) => {
      for (const node of nodes) {
        if (node.variantId === variantId)
          node.elements.forEach((element) => available.add(element));
        collect(node.children);
      }
    };
    collect(tree);
    const elements: Element[] = [];
    for (const selector of restoreSelectors) {
      try {
        const element = canvas.current?.querySelector(selector);
        if (!element || !available.has(element)) return;
        elements.push(element);
      } catch {
        return;
      }
    }
    restoredLink.current = restoreSelectors;
    if (layerSelectors !== null) setMode('select');
    setSelection(elements);
    if (layerSelectors !== null)
      requestAnimationFrame(() =>
        window.dispatchEvent(
          new CustomEvent('xuui:zoom-to', { detail: elements }),
        ),
      );
  }, [restoreSelectors, layerSelectors, tree, variantId]);
  useEffect(() => {
    if (restoredLink.current !== restoreSelectors) return;
    writeSession(
      `xuui:${study.id}:${variantId}:selection:v1`,
      selection
        .filter((element) => element.isConnected)
        .map((element) => selectorFor(element, variantId)),
    );
  }, [selection, study.id, variantId, restoreSelectors]);
  const newVariantIds = useNewVariants(
    study.id,
    study.variants.map((item) => item.id),
  );
  // In All, a study with lineage is laid out as its history: generations as
  // columns, joined by the review comments that led from one to the next.
  const lineage = useMemo(() => {
    if (!allVariants) return null;
    const columns = lineageColumns(canvasVariants);
    if (!columns) return null;
    return {
      columns,
      placements: lineagePlacements(columns, canvasVariants),
      edges: lineageEdges(canvasVariants),
      comments: postedComments(review.reviews),
    };
  }, [allVariants, canvasVariants, review.reviews]);
  const renderFrame = (variant: Variant) => (
    <div
      key={variant.id}
      data-variant-id={variant.id}
      data-variant-name={variant.name}
      data-new-variant={newVariantIds.has(variant.id) || undefined}
      data-variant-loading={workingVariantIds.has(variant.id) || undefined}
      className="relative shrink-0"
      style={lineage?.placements.get(variant.id)}
      onPointerDownCapture={(event) => {
        if (
          allVariants &&
          mode !== 'comment' &&
          variant.id !== variantId &&
          event.target instanceof Element &&
          event.target.closest('[data-xuui-design]') &&
          !event.altKey &&
          !event.currentTarget.closest('[data-pan-mode="true"]')
        )
          onVariantChange(variant.id);
      }}
    >
      {workingVariantIds.has(variant.id) ? (
        <div
          data-frame-title
          className="absolute -top-7 left-0 flex h-5 items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
        >
          <span>{variant.name}</span>
          <VariantSpinner />
        </div>
      ) : (
        <VariantLabel
          studyId={study.id}
          variant={variant}
          active={variant.id === variantId}
          comparison={allVariants}
          selection={selection}
          onOpen={() => onVariantChange(variant.id, true)}
          onSelect={() => {
            // Like a frame name in a design tool, the title selects the
            // variant's top layer and fits it to the canvas, as Shift+2 does.
            const root = tree.find((node) => node.variantId === variant.id);
            if (root) selectLayer(root);
            else onVariantChange(variant.id);
            // Fit once a variant switch has settled, so recentring can't undo it.
            requestAnimationFrame(() =>
              window.dispatchEvent(
                new CustomEvent('xuui:zoom-to', {
                  detail: root?.elements ?? [
                    ...document.querySelectorAll(
                      `[data-variant-id="${CSS.escape(variant.id)}"] [data-xuui-design]`,
                    ),
                  ],
                }),
              ),
            );
          }}
        />
      )}
      <VariantSurface
        variant={variant}
        grids={grids.forVariant(variant)}
        bindings={parameters.bindingsFor(variant.id, variant.controls)}
        designRef={variant.id === variantId && !isWorking ? design : undefined}
        progress={pendingVariants.find((item) => item.variantId === variant.id)}
      />
    </div>
  );
  const selectLayer = (node: LayerNode) => {
    setFocusedComment(null);
    setMode('select');
    setPendingComment(null);
    if (node.variantId !== variantId) onVariantChange(node.variantId);
    setSelection(node.elements);
  };
  const revealComment = (comment: Comment, editable: boolean) => {
    if (comment.variantId !== variantId) onVariantChange(comment.variantId);
    setFocusedComment(comment);
    setPendingComment(null);
    setMode(editable ? 'comment' : 'select');
    requestAnimationFrame(() => {
      const element = findCommentElement(comment);
      if (element) {
        window.dispatchEvent(
          new CustomEvent('xuui:zoom-to', { detail: [element] }),
        );
        if (!editable) setSelection([element]);
      }
      if (editable) editComment(comment);
    });
  };
  const layerPanel = (
    <LayerPanel
      tree={tree}
      selection={selection}
      focusRequest={layerFocusRequest}
      onSelect={selectLayer}
      studyControls={
        <StudyControls
          studyId={study.id}
          variantId={variant?.id}
          variants={canvasVariants}
          onVariantChange={onVariantChange}
          studies={studies}
          onStudyChange={onStudyChange}
          allVariants={allVariants}
          onAllVariantsChange={onAllVariantsChange}
          newVariantIds={newVariantIds}
          workingVariantIds={workingVariantIds}
          onCollapse={() => {
            if (compactLayout) setLayersSheetOpen(false);
            else {
              setLayersOpen(false);
              layerFocusReturn.current = requestAnimationFrame(focusCanvas);
            }
          }}
        />
      }
      onCanvasFocus={leaveLayers}
    />
  );
  return (
    <div className="h-dvh bg-studio-background pb-3 text-foreground">
      <ResizablePanelGroup
        orientation={compactLayout ? 'vertical' : 'horizontal'}
        className="h-[calc(100dvh-0.75rem)]"
        style={{ overflow: 'visible' }}
      >
        {!compactLayout && layersOpen && (
          <>
            <ResizablePanel
              id="layers"
              defaultSize={224}
              minSize={200}
              maxSize={320}
              groupResizeBehavior="preserve-pixel-size"
            >
              {layerPanel}
            </ResizablePanel>
            <ResizableHandle
              aria-label="Resize layers"
              className="w-0 bg-transparent after:w-3"
            />
          </>
        )}
        <ResizablePanel
          id="canvas"
          minSize="30%"
          className={cn(
            'pt-5',
            (compactLayout || !layersOpen) && 'pl-5',
            (compactLayout || !sidebarOpen) && 'pr-3',
          )}
          style={{ overflow: 'visible' }}
        >
          <section
            ref={canvas}
            data-canvas-mode={mode}
            aria-label="Canvas"
            className="relative h-full min-w-0 rounded-xl border border-canvas-border bg-canvas"
          >
            <CanvasViewport
              studyId={study.id}
              activeId={variantId}
              selection={selection}
              mode={allVariants ? 'all' : 'focused'}
            >
              <div
                data-lineage={lineage ? '' : undefined}
                className={
                  lineage ? 'lineage-layout' : 'flex items-start gap-20'
                }
              >
                {visible.map(renderFrame)}
                {lineage && (
                  <LineageMap
                    edges={lineage.edges}
                    workingVariantIds={workingVariantIds}
                    comments={lineage.comments.filter(
                      (comment) => comment.id !== focusedComment?.id,
                    )}
                  />
                )}
              </div>
            </CanvasViewport>
            <WorkspaceRulers
              key={`${variantId}:${isWorking}`}
              designRef={design}
              studyId={study.id}
              variantId={variantId}
              visible={rulersVisible && !allVariants && !isWorking}
              guidesVisible={!allVariants && !isWorking}
              selectionEnabled={mode === 'select' && !isWorking}
              selection={selection}
              onSelect={selectCanvasLayers}
              onInspect={setSelectedLayer}
            />
            <CanvasTools
              mode={mode}
              onChange={changeMode}
              grids={
                variant &&
                !isWorking && (
                  <ViewSettings
                    key={variant.id}
                    grids={grids.forVariant(variant)}
                    declared={(variant.grids ?? []).map((grid) => grid.type)}
                    rulers={rulersVisible}
                    onRulersChange={setRulersVisible}
                    onChange={(value) => grids.update(variant.id, value)}
                    onReset={() => grids.reset(variant.id)}
                  />
                )
              }
            />
            {(compactLayout || !layersOpen) && (
              <Button
                data-workspace-control
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 left-3"
                aria-label="Expand layers"
                ref={layersTrigger}
                aria-keyshortcuts="L"
                onClick={openLayers}
              >
                <ChevronsRight data-icon="inline-start" />
              </Button>
            )}
            <CanvasFeedback
              canvasRef={canvas}
              mode={mode}
              comments={review.comments}
              focused={focusedComment}
              pending={pendingComment}
              busy={review.busy}
              onEdit={(comment) => {
                if (
                  review.reviews.some((record) =>
                    record.comments.some((item) => item.id === comment.id),
                  )
                )
                  revealComment(comment, false);
                else editComment(comment);
              }}
            />
            {!sidebarOpen && (
              <Button
                data-workspace-control
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                aria-label="Expand sidebar"
                title="Expand sidebar (⌘\ / Ctrl+\)"
                onClick={() => setSidebarOpen(true)}
              >
                <ChevronsLeft data-icon="inline-start" />
              </Button>
            )}
          </section>
        </ResizablePanel>
        {sidebarOpen && (
          <>
            <ResizableHandle
              aria-label="Resize sidebar"
              className="w-0 bg-transparent after:w-3 aria-[orientation=horizontal]:h-0 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:h-3"
            />
            <ResizablePanel
              id="sidebar"
              defaultSize={compactLayout ? '45%' : 272}
              minSize={compactLayout ? '30%' : 240}
              maxSize={compactLayout ? '70%' : 480}
              groupResizeBehavior="preserve-pixel-size"
            >
              <ParameterPanel
                variant={variant}
                studyId={study.id}
                selectedLayer={
                  mode === 'select' && selectedLayer?.variantId === variantId
                    ? selectedLayer
                    : null
                }
                {...parameters}
                onCollapse={() => setSidebarOpen(false)}
                feedbackPanel={
                  <ReviewPanel
                    key={study.id}
                    study={study}
                    state={review}
                    onEdit={(comment) => revealComment(comment, true)}
                    onOpen={(comment) => revealComment(comment, false)}
                  />
                }
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      {compactLayout && (
        <Sheet open={layersSheetOpen} onOpenChange={setLayersSheetOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="layers-sheet"
            initialFocus={() =>
              document.querySelector<HTMLElement>(
                '[data-layer-panel] [role="treeitem"][tabindex="0"]',
              ) ?? true
            }
            finalFocus={() => {
              if (returnLayersToCanvas.current) {
                // Restore the canvas itself rather than one of its preview buttons.
                queueMicrotask(focusCanvas);
                return false;
              }
              return layersTrigger.current ?? true;
            }}
          >
            <SheetTitle className="sr-only">Layers</SheetTitle>
            <SheetDescription className="sr-only">
              Browse and select the layers in this component.
            </SheetDescription>
            {layerPanel}
          </SheetContent>
        </Sheet>
      )}
      {pendingComment && (
        <CommentEditor
          key={pendingComment.id}
          comment={pendingComment}
          canDelete={review.comments.some(
            (comment) => comment.id === pendingComment.id,
          )}
          onSave={async (comment) => {
            const saved = await review.save(comment);
            if (saved) clearEditorDraft(comment);
            return saved;
          }}
          onCancel={() => {
            clearEditorDraft(pendingComment);
            closeComment();
          }}
          onDismiss={(comment) => {
            setCommentEditorDrafts((previous) => ({
              ...previous,
              [commentDraftKey(comment)]: comment.body,
            }));
            setPendingComment(null);
          }}
          onDelete={() => {
            clearEditorDraft(pendingComment);
            review.remove(pendingComment.id);
            closeComment();
          }}
          onChange={(comment) => {
            setPendingComment(comment);
            setCommentEditorDrafts((previous) => ({
              ...previous,
              [commentDraftKey(comment)]: comment.body,
            }));
          }}
        />
      )}
    </div>
  );
}
