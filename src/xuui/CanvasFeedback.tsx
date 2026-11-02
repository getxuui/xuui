import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, MousePointer2, Play, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
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
      className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-border bg-card p-1 shadow-studio-floating"
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
              data-comment-marker={index < 0 || undefined}
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
                <img
                  src="/cursors/comment.svg"
                  alt=""
                  draggable={false}
                  className="pointer-events-none size-6"
                />
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
  canDelete,
  onSave,
  onCancel,
  onDismiss,
  onDelete,
}: {
  comment: Comment;
  canDelete: boolean;
  onSave: (comment: Comment) => boolean;
  onCancel: () => void;
  onDismiss: (comment: Comment) => void;
  onDelete: () => void;
}) {
  const popup = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const [body, setBody] = useState(comment.body);
  const [error, setError] = useState('');
  const [point, setPoint] = useState({
    x: Math.max(12, (window.innerWidth - 320) / 2),
    y: window.innerHeight / 2,
    availableHeight: window.innerHeight - 24,
  });
  const save = () => {
    if (!body.trim()) {
      setError('Write a comment before adding it.');
      input.current?.focus();
      return;
    }
    if (body.length > 4000) {
      setError('Keep the comment under 4,000 characters.');
      return;
    }
    if (
      onSave({
        ...comment,
        body: body.trim(),
        ...(comment.agentation
          ? { agentation: { ...comment.agentation, comment: body.trim() } }
          : {}),
      })
    )
      onCancel();
  };
  useLayoutEffect(() => input.current?.focus(), []);
  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      if (
        !(event.target instanceof Node) ||
        popup.current?.contains(event.target)
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest('[data-xuui-design], [data-comment-pin]')
      ) {
        // Dismiss this editor before another canvas click starts a comment.
        event.preventDefault();
        event.stopPropagation();
      }
      onDismiss({ ...comment, body });
    };
    document.addEventListener('click', dismiss, true);
    return () => document.removeEventListener('click', dismiss, true);
  }, [body, comment, onDismiss]);
  useLayoutEffect(() => {
    let frame: number;
    const update = () => {
      const rect = findCommentElement(comment)?.getBoundingClientRect();
      const pin = document
        .querySelector<HTMLElement>(
          `[data-comment-pin="${CSS.escape(comment.id)}"]`,
        )
        ?.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const popupWidth =
        popup.current?.offsetWidth ?? Math.min(320, width - 24);
      const popupHeight = popup.current?.offsetHeight ?? 240;
      const pinLeft =
        pin?.left ??
        (rect
          ? rect.x + rect.width * (comment.target.pin?.x ?? 1) - 3
          : left + (width - popupWidth) / 2);
      const pinTop =
        pin?.top ??
        (rect
          ? rect.y + rect.height * (comment.target.pin?.y ?? 0) - 3
          : top + height / 2);
      const below = pinTop + (pin?.height ?? 24) + 12;
      const above = pinTop - popupHeight - 12;
      const preferredTop =
        below + popupHeight > top + height - 12 && above >= top + 12
          ? above
          : below;
      const next = {
        x: Math.max(
          left + 12,
          Math.min(left + width - popupWidth - 12, pinLeft),
        ),
        y: Math.max(
          top + 12,
          Math.min(top + height - popupHeight - 12, preferredTop),
        ),
        availableHeight: Math.max(0, height - 24),
      };
      setPoint((previous) =>
        previous.x === next.x &&
        previous.y === next.y &&
        previous.availableHeight === next.availableHeight
          ? previous
          : next,
      );
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [comment]);
  return createPortal(
    <form
      ref={popup}
      id="xuui-comment-editor"
      data-workspace-control
      data-xuui-comment-editor
      role="dialog"
      aria-label="Element comment"
      className="fixed z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-4 overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-studio-floating"
      style={{ left: point.x, top: point.y, maxHeight: point.availableHeight }}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          save();
        }
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-3 right-3"
        aria-label="Close comment"
        onClick={onCancel}
      >
        <X data-icon="inline-start" />
      </Button>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={`${id}-body`} className="sr-only">
          Comment
        </FieldLabel>
        <div className="group/comment-area relative">
          <Textarea
            ref={input}
            id={`${id}-body`}
            value={body}
            rows={4}
            maxLength={4000}
            placeholder="Add a comment"
            className="h-24 min-h-24 max-h-48 resize-y px-0 pt-0 pe-7 pb-7"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => {
              setBody(event.target.value);
              setError('');
            }}
          />
          {body.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label="Clear comment"
              className="absolute right-3 bottom-0 text-muted-foreground opacity-0 transition-opacity group-hover/comment-area:opacity-100 focus-visible:opacity-100"
              onClick={() => {
                setBody('');
                setError('');
                input.current?.focus();
              }}
            >
              Clear
            </Button>
          )}
        </div>
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-xs text-destructive"
          >
            {error}
          </p>
        )}
      </Field>
      <footer className="flex items-center justify-end gap-2">
        {canDelete && (
          <Button
            type="button"
            variant="destructive"
            size="icon-xs"
            className="me-auto"
            aria-label="Delete annotation"
            onClick={onDelete}
          >
            <Trash2 data-icon="inline-start" />
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {canDelete ? 'Save' : 'Add comment'}
        </Button>
      </footer>
    </form>,
    document.body,
  );
}
