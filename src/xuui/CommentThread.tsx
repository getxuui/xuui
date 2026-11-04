import type { ReactNode } from 'react';

export function CommentThread({
  number,
  context,
  body,
  actions,
  footer,
  commentId,
  reviewId,
  onOpen,
}: {
  number?: number;
  /** Where the comment points, such as its variant and layer. */
  context: string;
  body: string;
  actions?: ReactNode;
  footer?: ReactNode;
  commentId: string;
  reviewId?: string;
  onOpen: () => void;
}) {
  return (
    <li
      data-comment-id={commentId}
      data-review-id={reviewId}
      className="relative min-w-0 rounded-[10px] bg-muted p-3 text-start"
    >
      <div className="flex min-w-0 items-start gap-1">
        {/* The number matches the comment's pin and opens the comment. Its
            hit area covers the card; actions sit above it. */}
        <button
          type="button"
          data-comment-number={number}
          className="comment-number feedback-pin grid size-5 shrink-0 place-items-center after:absolute after:inset-0 after:rounded-[10px] after:content-['']"
          aria-label={`Open comment ${number ?? 'draft'}: ${context}`}
          title={context}
          onClick={onOpen}
        >
          {number ?? '…'}
        </button>
        <span className="flex-1" />
        {actions && (
          <div className="relative z-10 flex shrink-0 items-center gap-1">
            {actions}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs leading-[1.5] wrap-anywhere whitespace-pre-wrap">
        {body}
      </p>
      {footer && (
        <div className="relative z-10 mt-2.5 flex flex-wrap items-center gap-2">
          {footer}
        </div>
      )}
    </li>
  );
}
