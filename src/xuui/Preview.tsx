import { useEffect, useRef, useState } from 'react';
import { PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import type { Comment, Project } from './model';
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

export default function Preview({
  project,
  iterationId,
  onVariationChange,
  allVariants,
  onAllVariantsChange,
  studies,
  onStudyChange,
}: {
  project: Project;
  iterationId: string;
  onVariationChange: (id: string, focus?: boolean) => void;
  allVariants: boolean;
  onAllVariantsChange: (all: boolean) => void;
  studies: Project[];
  onStudyChange: (id: string) => void;
}) {
  const iteration = project.iterations.find((item) => item.id === iterationId);
  const design = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<CanvasMode>('select');
  const [pendingComment, setPendingComment] = useState<Comment | null>(null);
  const review = useReviews(studies, project);
  const parameters = useParameters(iteration?.controls, iterationId);
  const [compactLayout, setCompactLayout] = useState(
    () => window.matchMedia('(max-width: 767px)').matches,
  );
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
  const theme = useStudioTheme();

  const changeMode = (next: CanvasMode) => {
    setPendingComment(null);
    setMode(next);
  };
  const editComment = (comment: Comment) => {
    setMode('comment');
    setPendingComment(comment);
  };
  const closeComment = () => {
    setPendingComment(null);
    canvas.current?.querySelector('main')?.focus({ preventScroll: true });
  };
  useEffect(() => setPendingComment(null), [project.id, iterationId]);
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
              'input, textarea, select, [data-workspace-control][role="group"], [role="textbox"], [role="combobox"], [role="listbox"], [role="option"], [role="slider"], [role="spinbutton"], [role="separator"], [data-xuui-comment-editor]',
            )))
      )
        return;
      const index = project.iterations.findIndex(
        (item) => item.id === iterationId,
      );
      const next =
        project.iterations[index + (event.key === 'ArrowDown' ? 1 : -1)];
      if (index < 0 || !next) return;
      event.preventDefault();
      onVariationChange(next.id);
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, [project.iterations, iterationId, onVariationChange]);

  useEffect(() => {
    document.title = `${iteration?.name ?? 'Unknown variant'} · xuui`;
  }, [iteration]);
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

  const visible = allVariants
    ? project.iterations
    : iteration
      ? [iteration]
      : [];
  return (
    <div className="h-dvh bg-studio-background pt-5 pr-3 pb-3 pl-5 text-foreground">
      <ResizablePanelGroup
        orientation={compactLayout ? 'vertical' : 'horizontal'}
        className="h-[calc(100dvh-2rem)]"
        style={{ overflow: 'visible' }}
      >
        <ResizablePanel
          id="canvas"
          minSize="30%"
          style={{ overflow: 'visible' }}
        >
          <section
            ref={canvas}
            data-canvas-mode={mode}
            aria-label="Canvas"
            className="relative h-full min-w-0 rounded-xl border border-canvas-border bg-canvas"
          >
            <CanvasViewport
              activeId={iterationId}
              mode={allVariants ? 'all' : 'focused'}
            >
              {visible.map((variant) => (
                <div
                  key={variant.id}
                  data-variant-id={variant.id}
                  className="relative shrink-0"
                  onPointerDownCapture={(event) => {
                    if (
                      allVariants &&
                      mode !== 'comment' &&
                      variant.id !== iterationId &&
                      event.target instanceof Element &&
                      event.target.closest('[data-xuui-design]') &&
                      !event.altKey &&
                      !event.currentTarget.closest('[data-pan-mode="true"]')
                    )
                      onVariationChange(variant.id);
                  }}
                >
                  {allVariants && (
                    <Button
                      data-workspace-control
                      variant="ghost"
                      size="sm"
                      className="absolute -top-9 left-0"
                      aria-pressed={variant.id === iterationId}
                      onClick={() => onVariationChange(variant.id)}
                    >
                      {variant.name}
                    </Button>
                  )}
                  <VariantSurface
                    iteration={variant}
                    bindings={parameters.bindingsFor(
                      variant.id,
                      variant.controls,
                    )}
                    designRef={variant.id === iterationId ? design : undefined}
                  />
                </div>
              ))}
            </CanvasViewport>
            <WorkspaceRulers
              key={iterationId}
              designRef={design}
              projectId={project.id}
              iterationId={iterationId}
              visible={rulersVisible}
              selectionEnabled={mode === 'select'}
            />
            <CanvasTools mode={mode} onChange={changeMode} />
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
                <PanelRightOpen data-icon="inline-start" />
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
                iteration={iteration}
                projectId={project.id}
                {...parameters}
                onCollapse={() => setSidebarOpen(false)}
                variations={project.iterations}
                onVariationChange={onVariationChange}
                studies={studies}
                onStudyChange={onStudyChange}
                allVariants={allVariants}
                onAllVariantsChange={onAllVariantsChange}
                feedbackPanel={
                  <ReviewPanel
                    key={project.id}
                    study={project}
                    state={review}
                    onAdd={() => changeMode('comment')}
                    onEdit={(comment) => {
                      if (comment.iterationId !== iterationId)
                        onVariationChange(comment.iterationId, true);
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
      {pendingComment && (
        <CommentEditor
          key={pendingComment.id}
          comment={pendingComment}
          lightMode={theme === 'light'}
          canDelete={review.comments.some(
            (comment) => comment.id === pendingComment.id,
          )}
          onSave={review.save}
          onCancel={closeComment}
          onDelete={() => {
            review.remove(pendingComment.id);
            closeComment();
          }}
        />
      )}
    </div>
  );
}
