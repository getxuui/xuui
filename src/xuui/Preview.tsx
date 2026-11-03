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
import type { Comment, Study } from './model';
import { useStudioTheme } from './useStudioTheme';
import { WorkspaceRulers } from './WorkspaceRulers';
import { useParameters } from './useParameters';
import { ParameterPanel } from './ParameterPanel';
import { CanvasViewport } from './CanvasViewport';
import { VariantSurface } from './VariantSurface';
import { CanvasFeedback, CanvasTools, CommentEditor } from './CanvasFeedback';
import type { CanvasMode } from './CanvasFeedback';
import { ReviewPanel } from './ReviewPanel';
import { useReviews } from './useReviews';
import type { LayerProperties } from './layerProperties';
import { LayerPanel } from './LayerPanel';
import { useLayerTree } from './useLayerTree';
import { StudyControls } from './StudyControls';
import { VariantLabel } from './VariantLabel';

export default function Preview({
  study,
  variantId,
  onVariantChange,
  allVariants,
  onAllVariantsChange,
  studies,
  onStudyChange,
}: {
  study: Study;
  variantId: string;
  onVariantChange: (id: string, focus?: boolean) => void;
  allVariants: boolean;
  onAllVariantsChange: (all: boolean) => void;
  studies: Study[];
  onStudyChange: (id: string) => void;
}) {
  const variant = study.variants.find((item) => item.id === variantId);
  const design = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLElement>(null);
  const focusCanvas = useCallback(
    () => canvas.current?.querySelector('main')?.focus({ preventScroll: true }),
    [],
  );
  const returnLayersToCanvas = useRef(false);
  const layerFocusReturn = useRef(0);
  const layersTrigger = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<CanvasMode>('select');
  const [selection, setSelection] = useState<Element[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<LayerProperties | null>(
    null,
  );
  const [pendingComment, setPendingComment] = useState<Comment | null>(null);
  const commentEditorDrafts = useRef(new Map<string, string>());
  const review = useReviews(studies, study);
  const parameters = useParameters(variant?.controls, variantId);
  const [compactLayout, setCompactLayout] = useState(
    () => window.matchMedia('(max-width: 767px)').matches,
  );
  const [layersOpen, setLayersOpen] = useState(true);
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

  useEffect(() => {
    const copyLink = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'l' ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.repeat ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest(
              'input, textarea, select, [role="textbox"], [data-xuui-comment-editor]',
            )))
      )
        return;
      event.preventDefault();
      canvas.current
        ?.querySelector<HTMLButtonElement>(
          `[data-copy-variant-link="${CSS.escape(variantId)}"]`,
        )
        ?.click();
    };
    window.addEventListener('keydown', copyLink, true);
    return () => window.removeEventListener('keydown', copyLink, true);
  }, [variantId]);

  const changeMode = (next: CanvasMode) => {
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
      body:
        commentEditorDrafts.current.get(commentDraftKey(comment)) ??
        comment.body,
    });
  };
  const closeComment = () => {
    setPendingComment(null);
    canvas.current?.querySelector('main')?.focus({ preventScroll: true });
  };
  useEffect(() => setPendingComment(null), [study.id, variantId]);
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
      const index = study.variants.findIndex((item) => item.id === variantId);
      const next = study.variants[index + (event.key === 'ArrowDown' ? 1 : -1)];
      if (index < 0 || !next) return;
      event.preventDefault();
      onVariantChange(next.id);
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, [study.variants, variantId, onVariantChange]);

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
  }, []);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'b' ||
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
    () => (allVariants ? study.variants : variant ? [variant] : []),
    [allVariants, study.variants, variant],
  );
  const variantIds = useMemo(
    () => visible.map((variant) => variant.id),
    [visible],
  );
  const tree = useLayerTree(canvas, variantIds);
  const layerPanel = (
    <LayerPanel
      tree={tree}
      selection={selection}
      focusRequest={layerFocusRequest}
      onSelect={(node) => {
        setMode('select');
        setPendingComment(null);
        if (node.variantId !== variantId) onVariantChange(node.variantId);
        setSelection(node.elements);
      }}
      studyControls={
        <StudyControls
          studyId={study.id}
          variantId={variant?.id}
          variants={study.variants}
          onVariantChange={onVariantChange}
          studies={studies}
          onStudyChange={onStudyChange}
          allVariants={allVariants}
          onAllVariantsChange={onAllVariantsChange}
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
              activeId={variantId}
              mode={allVariants ? 'all' : 'focused'}
            >
              {visible.map((variant) => (
                <div
                  key={variant.id}
                  data-variant-id={variant.id}
                  data-variant-name={variant.name}
                  className="relative shrink-0"
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
                  <VariantLabel
                    studyId={study.id}
                    variant={variant}
                    active={variant.id === variantId}
                    comparison={allVariants}
                    onSelect={() => onVariantChange(variant.id)}
                  />
                  <VariantSurface
                    variant={variant}
                    bindings={parameters.bindingsFor(
                      variant.id,
                      variant.controls,
                    )}
                    designRef={variant.id === variantId ? design : undefined}
                  />
                </div>
              ))}
            </CanvasViewport>
            <WorkspaceRulers
              key={variantId}
              designRef={design}
              studyId={study.id}
              variantId={variantId}
              visible={rulersVisible}
              selectionEnabled={mode === 'select'}
              selection={selection}
              onSelect={setSelection}
              onInspect={setSelectedLayer}
            />
            <CanvasTools mode={mode} onChange={changeMode} />
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
              pending={pendingComment}
              busy={review.busy}
              onEdit={editComment}
            />
            {!sidebarOpen && (
              <Button
                data-workspace-control
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                aria-label="Expand sidebar"
                title="Expand sidebar (⌘B / Ctrl+B)"
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
                    onEdit={(comment) => {
                      if (comment.variantId !== variantId)
                        onVariantChange(comment.variantId, true);
                      // Wait for the variant switch before opening its editor.
                      requestAnimationFrame(() => editComment(comment));
                    }}
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
          onSave={(comment) => {
            const saved = review.save(comment);
            if (saved)
              commentEditorDrafts.current.delete(commentDraftKey(comment));
            return saved;
          }}
          onCancel={() => {
            commentEditorDrafts.current.delete(commentDraftKey(pendingComment));
            closeComment();
          }}
          onDismiss={(comment) => {
            commentEditorDrafts.current.set(
              commentDraftKey(comment),
              comment.body,
            );
            setPendingComment(null);
          }}
          onDelete={() => {
            commentEditorDrafts.current.delete(commentDraftKey(pendingComment));
            review.remove(pendingComment.id);
            closeComment();
          }}
        />
      )}
    </div>
  );
}
