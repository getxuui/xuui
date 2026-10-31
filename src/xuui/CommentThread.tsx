import type { ReactNode } from 'react';

export function CommentThread({
  variant,
  target,
  body,
  actions,
  footer,
  commentId,
  reviewId,
}: {
  variant: string;
  target?: string;
  body: string;
  actions?: ReactNode;
  footer?: ReactNode;
  commentId: string;
  reviewId?: string;
}) {
  return (
    <li
      data-comment-id={commentId}
      data-review-id={reviewId}
      className="min-w-0 rounded-[10px] bg-muted p-3 text-start"
    >
      <div className="flex min-w-0 items-start gap-1">
        <p className="flex min-w-0 flex-1 flex-wrap gap-x-1 text-xs font-medium text-muted-foreground">
          <span className="wrap-anywhere">{variant}</span>
          {target && (
            <>
              <span aria-hidden="true">/</span>
              <span className="wrap-anywhere">{target}</span>
            </>
          )}
        </p>
        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
      <p className="mt-1 text-xs leading-[1.5] wrap-anywhere whitespace-pre-wrap">
        {body}
      </p>
      {footer && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">{footer}</div>
      )}
    </li>
  );
}
