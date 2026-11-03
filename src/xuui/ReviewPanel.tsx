import { useState } from 'react';
import { Check, Copy, Pencil, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatReview } from './model';
import type { Comment, Study, Review } from './model';
import type { ReviewState } from './useReviews';
import { ReviewReceipt } from './ReviewReceipt';
import { CommentThread } from './CommentThread';

export function ReviewPanel({
  study,
  state,
  onEdit,
}: {
  study: Study;
  state: ReviewState;
  onEdit: (comment: Comment) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState<string | null>(null);
  const [fallback, setFallback] = useState('');
  const variantName = (id: string) =>
    study.variants.find((item) => item.id === id)?.name ?? id;
  const reviews = state.reviews.filter(
    (review) => filter !== 'unread' || !state.receipts[review.id],
  );
  const targetName = (comment: Comment) =>
    comment.agentation?.element ||
    comment.target.accessibleName ||
    comment.target.tagName;
  const copy = async (review: Review, copyKey: string) => {
    const text = formatReview(review);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(copyKey);
      setFallback('');
    } catch {
      setFallback(text);
    }
  };
  return (
    <section
      aria-labelledby="comments-heading"
      className="flex min-w-0 flex-col gap-3"
    >
      <h2 id="comments-heading" className="text-xs font-semibold">
        Comments
      </h2>
      {state.reviews.length > 0 && (
        <ToggleGroup
          aria-label="Comment filter"
          size="sm"
          value={[filter]}
          onValueChange={(values) => {
            if (values[0]) setFilter(values[0]);
          }}
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
        </ToggleGroup>
      )}
      {!state.comments.length && !state.reviews.length && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Press C, then click an element to comment.
        </p>
      )}
      {state.comments.length > 0 && (
        <ol aria-label="Draft comments" className="flex flex-col gap-2">
          {state.comments.map((comment, index) => (
            <CommentThread
              key={comment.id}
              commentId={comment.id}
              variant={variantName(comment.variantId)}
              target={targetName(comment)}
              body={comment.body}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Edit comment ${index + 1}`}
                    disabled={state.busy}
                    onClick={() => onEdit(comment)}
                  >
                    <Pencil data-icon="inline-start" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Delete comment ${index + 1}`}
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
      {state.comments.length > 0 && (
        <Button
          size="sm"
          disabled={state.busy}
          onClick={() => void state.submit()}
        >
          <Send data-icon="inline-start" />
          {state.busy ? 'Submitting…' : 'Submit review'}
        </Button>
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
            {reviews.flatMap((review) =>
              review.comments.map((comment) => (
                <CommentThread
                  key={`${review.id}:${comment.id}`}
                  commentId={comment.id}
                  reviewId={review.id}
                  variant={
                    review.variants.find(
                      (variant) => variant.id === comment.variantId,
                    )?.name ?? variantName(comment.variantId)
                  }
                  target={targetName(comment)}
                  body={comment.body}
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
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={
                          copied === `${review.id}:${comment.id}`
                            ? 'Copied review'
                            : 'Copy submitted review'
                        }
                        onClick={() =>
                          void copy(review, `${review.id}:${comment.id}`)
                        }
                      >
                        {copied === `${review.id}:${comment.id}` ? (
                          <Check data-icon="inline-start" />
                        ) : (
                          <Copy data-icon="inline-start" />
                        )}
                      </Button>
                    </>
                  }
                />
              )),
            )}
          </ol>
          {!reviews.length && (
            <p
              role="status"
              className="py-3 text-center text-xs text-muted-foreground"
            >
              All reviews have been read.
            </p>
          )}
        </>
      )}
      {fallback && (
        <Field>
          <FieldLabel htmlFor="review-copy">Select and copy review</FieldLabel>
          <Textarea
            id="review-copy"
            readOnly
            value={fallback}
            rows={6}
            onFocus={(event) => event.target.select()}
          />
        </Field>
      )}
    </section>
  );
}
