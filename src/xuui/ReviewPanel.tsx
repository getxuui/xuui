import { Pencil, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Comment, Study } from './model';
import type { ReviewState } from './useReviews';
import { ReviewReceipt } from './ReviewReceipt';
import { CommentThread } from './CommentThread';

export function ReviewPanel({
  study,
  state,
  onEdit,
  onOpen,
}: {
  study: Study;
  state: ReviewState;
  onEdit: (comment: Comment) => void;
  /** Show a submitted comment's element on the canvas. */
  onOpen: (comment: Comment) => void;
}) {
  const variantName = (id: string) =>
    study.variants.find((item) => item.id === id)?.name ?? id;
  const targetName = (comment: Comment) =>
    comment.agentation?.element ||
    comment.target.accessibleName ||
    comment.target.tagName;
  const context = (variant: string, comment: Comment) =>
    `${variant} / ${targetName(comment)}`;
  return (
    <section
      aria-labelledby="comments-heading"
      className="flex min-w-0 flex-col gap-3"
    >
      <h2 id="comments-heading" className="text-xs font-semibold">
        Comments
      </h2>
      {!state.comments.length && !state.reviews.length && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Press C, then click an element to comment.
        </p>
      )}
      {state.comments.length > 0 && (
        <ol aria-label="Draft comments" className="flex flex-col gap-2">
          {state.comments.map((comment) => (
            <CommentThread
              key={comment.id}
              commentId={comment.id}
              number={comment.number}
              context={context(variantName(comment.variantId), comment)}
              body={comment.body}
              onOpen={() => onEdit(comment)}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Edit comment ${comment.number ?? 'draft'}`}
                    disabled={state.busy}
                    onClick={() => onEdit(comment)}
                  >
                    <Pencil data-icon="inline-start" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Delete comment ${comment.number ?? 'draft'}`}
                    disabled={state.busy}
                    onClick={() => state.remove(comment.id)}
                  >
                    <Trash2 data-icon="inline-start" />
                  </Button>
                </>
              }
              footer={
                <span className="text-[11px] text-muted-foreground">Draft</span>
              }
            />
          ))}
        </ol>
      )}
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      {state.historyError && (
        <div className="flex flex-col gap-1">
          <p role="alert" className="text-xs text-destructive">
            {state.historyError}
          </p>
          <Button variant="ghost" size="xs" onClick={state.reload}>
            Retry history
          </Button>
        </div>
      )}
      {state.reviews.length > 0 && (
        <>
          <ol aria-label="Submitted comments" className="flex flex-col gap-2">
            {state.reviews.flatMap((review) =>
              review.comments.map((comment) => (
                <CommentThread
                  key={`${review.id}:${comment.id}`}
                  commentId={comment.id}
                  reviewId={review.id}
                  number={comment.number}
                  context={context(
                    review.variants.find(
                      (variant) => variant.id === comment.variantId,
                    )?.name ?? variantName(comment.variantId),
                    comment,
                  )}
                  body={comment.body}
                  onOpen={() => onOpen(comment)}
                  footer={
                    <>
                      <span role="status">
                        <ReviewReceipt
                          readAt={state.receipts[review.id]?.readAt}
                        />
                      </span>
                      <time
                        dateTime={review.submittedAt}
                        className="ms-auto shrink-0 font-mono text-[10px] text-muted-foreground"
                      >
                        {new Date(review.submittedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </>
                  }
                />
              )),
            )}
          </ol>
        </>
      )}
    </section>
  );
}

/** Keep the draft action available independently of the scrolling comments. */
export function ReviewSubmit({ state }: { state: ReviewState }) {
  return (
    <Button
      className="w-full"
      disabled={state.busy}
      onClick={() => void state.submit()}
    >
      <Send data-icon="inline-start" />
      {state.busy ? 'Submitting…' : 'Submit review'}
    </Button>
  );
}
