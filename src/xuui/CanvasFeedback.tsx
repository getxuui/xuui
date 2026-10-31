import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnnotationPopupCSS } from 'agentation';
import { MessageSquare, MousePointer2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { captureComment, findCommentElement } from './feedback';
import type { Comment } from './model';

export type CanvasMode = 'select' | 'interact' | 'comment';

export function CanvasTools({
  mode,
  onChange,
}: {
  mode: CanvasMode;
  onChange: (mode: CanvasMode) => void;
}) {
  return (
    <div
      data-workspace-control
      className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-border bg-card p-1 shadow-studio-floating"
    >
      <ToggleGroup
        aria-label="Canvas mode"
        size="sm"
        value={[mode]}
        onValueChange={(values) => {
          const next = values[0];
          if (next === 'select' || next === 'interact' || next === 'comment')
            onChange(next);
        }}
      >
        <ToggleGroupItem
          value="select"
          aria-label="Select layers"
          title="Select layers (V)"
        >
          <MousePointer2 data-icon="inline-start" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="interact"
          aria-label="Interact with preview"
          title="Interact with preview"
        >
          <Play data-icon="inline-start" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="comment"
          aria-label="Comment mode"
          title="Comment (C)"
        >
          <MessageSquare data-icon="inline-start" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

type Pin = { id: string; x: number; y: number; width: number; height: number };

export function CanvasFeedback({
  canvasRef,
  mode,
  comments,
  pending,
  busy,
  onEdit,
}: {
  canvasRef: RefObject<HTMLElement | null>;
  mode: CanvasMode;
  comments: Comment[];
  pending: Comment | null;
  busy: boolean;
  onEdit: (comment: Comment) => void;
}) {
  const [pins, setPins] = useState<Pin[]>([]);
  const hovered = useRef<Element | null>(null);
  const [hoverBox, setHoverBox] = useState<Pin | null>(null);
  const entries = pending
    ? [...comments.filter((item) => item.id !== pending.id), pending]
    : comments;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    if (mode !== 'comment') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const targetAt = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        !target?.closest('[data-xuui-design]') ||
        target.closest('[data-workspace-control]')
      )
        return null;
      return target instanceof SVGElement ? target.closest('svg') : target;
    };
    const down = (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        !targetAt(event) ||
        canvas.dataset.panMode === 'true'
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const click = (event: MouseEvent) => {
      const target = targetAt(event);
      if (
        !target ||
        event.button !== 0 ||
        canvas.dataset.panMode === 'true' ||
        canvas.dataset.panSuppressClick === 'true'
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (busy || pending) return;
      const variantId =
        target.closest<HTMLElement>('[data-variant-id]')?.dataset.variantId;
      if (variantId)
        onEdit(
          captureComment(target as HTMLElement, variantId, {
            x: event.clientX,
            y: event.clientY,
          }),
        );
    };
    const move = (event: MouseEvent) => {
      const target = targetAt(event);
      hovered.current =
        pending || canvas.dataset.panMode === 'true' ? null : target;
    };
    const leave = () => {
      hovered.current = null;
    };
    canvas.addEventListener('pointerdown', down, true);
    canvas.addEventListener('click', click, true);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseleave', leave);
    return () => {
      canvas.removeEventListener('pointerdown', down, true);
      canvas.removeEventListener('click', click, true);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseleave', leave);
      hovered.current = null;
    };
  }, [mode, canvasRef, busy, pending, onEdit]);

  useLayoutEffect(() => {
    if (mode !== 'comment') return;
    let frame: number;
    const update = () => {
      const area = canvasRef.current?.getBoundingClientRect();
      if (area) {
        const hoverRect = hovered.current?.getBoundingClientRect();
        const nextHover = hoverRect
          ? {
              id: 'hover',
              x: hoverRect.x - area.x,
              y: hoverRect.y - area.y,
              width: hoverRect.width,
              height: hoverRect.height,
            }
          : null;
        setHoverBox((previous) =>
          JSON.stringify(previous) === JSON.stringify(nextHover)
            ? previous
            : nextHover,
        );
        const next = entriesRef.current.flatMap((comment) => {
          const element = findCommentElement(comment);
          if (!element?.getClientRects().length) return [];
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return [];
          return [
            {
              id: comment.id,
              x: rect.x - area.x,
              y: rect.y - area.y,
              width: rect.width,
              height: rect.height,
            },
          ];
        });
        setPins((previous) =>
          JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
        );
      }
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [canvasRef, mode]);

  if (mode !== 'comment') return null;
  return (
    <div
      data-feedback-pins
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
    >
      {!pending && hoverBox && (
        <div
          className="feedback-highlight"
          style={{
            left: hoverBox.x,
            top: hoverBox.y,
            width: hoverBox.width,
            height: hoverBox.height,
          }}
        />
      )}
      {pins.map((pin) => {
        const comment = entries.find((item) => item.id === pin.id);
        if (!comment) return null;
        const index = comments.findIndex((item) => item.id === pin.id);
        const point = comment.target.pin ?? { x: 1, y: 0 };
        return (
          <div key={pin.id}>
            {pending?.id === pin.id && (
              <div
                className="feedback-highlight"
                style={{
                  left: pin.x,
                  top: pin.y,
                  width: pin.width,
                  height: pin.height,
                }}
              />
            )}
            <Button
              data-workspace-control
              data-comment-pin={pin.id}
              className="feedback-pin pointer-events-auto absolute"
              size="icon-xs"
              aria-label={`Comment ${index >= 0 ? index + 1 : 'draft'}: ${comment.body || 'New comment'}`}
              disabled={busy}
              style={{
                left: pin.x + pin.width * point.x,
                top: pin.y + pin.height * point.y,
              }}
              onClick={() => onEdit(comment)}
            >
              {index >= 0 ? (
                index + 1
              ) : (
                <MessageSquare data-icon="inline-start" />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function CommentEditor({
  comment,
  lightMode,
  canDelete,
  onSave,
  onCancel,
  onDelete,
}: {
  comment: Comment;
  lightMode: boolean;
  canDelete: boolean;
  onSave: (comment: Comment) => boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const [error, setError] = useState('');
  useLayoutEffect(() => {
    // The upstream popup exposes a placeholder, so supply the field's accessible name here.
    const input = editor.current?.querySelector('textarea');
    if (input) {
      input.setAttribute('aria-label', 'Comment');
      input.maxLength = 4000;
    }
  }, []);
  useLayoutEffect(() => {
    let frame: number;
    const update = () => {
      const rect = findCommentElement(comment)?.getBoundingClientRect();
      const next = {
        x: Math.max(
          152,
          Math.min(
            window.innerWidth - 152,
            rect
              ? rect.x + rect.width * (comment.target.pin?.x ?? 1)
              : window.innerWidth / 2,
          ),
        ),
        y: Math.max(
          20,
          Math.min(
            window.innerHeight - 250,
            rect
              ? rect.y + rect.height * (comment.target.pin?.y ?? 0) + 24
              : window.innerHeight / 2 - 100,
          ),
        ),
      };
      setPoint((previous) =>
        previous.x === next.x && previous.y === next.y ? previous : next,
      );
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [comment]);
  return createPortal(
    <div
      ref={editor}
      id="xuui-comment-editor"
      data-workspace-control
      data-xuui-comment-editor
      role="dialog"
      aria-label="Element comment"
    >
      <AnnotationPopupCSS
        key={comment.id}
        element={comment.agentation?.element ?? comment.target.tagName}
        initialValue={comment.body}
        placeholder="What should change?"
        submitLabel={canDelete ? 'Save' : 'Add comment'}
        lightMode={lightMode}
        accentColor="var(--guide)"
        style={{ left: point.x, top: point.y }}
        onSubmit={(body) => {
          if (body.length > 4000)
            return setError('Keep the comment under 4,000 characters.');
          if (
            onSave({
              ...comment,
              body,
              ...(comment.agentation
                ? { agentation: { ...comment.agentation, comment: body } }
                : {}),
            })
          )
            onCancel();
        }}
        onCancel={onCancel}
        onDelete={canDelete ? onDelete : undefined}
      />
      {error && (
        <p
          role="alert"
          className="fixed z-50 rounded-lg bg-card p-2 text-xs text-destructive"
          style={{ left: point.x - 140, top: point.y - 30 }}
        >
          {error}
        </p>
      )}
    </div>,
    document.body,
  );
}
