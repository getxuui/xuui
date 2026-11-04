import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  commentSchema,
  commentNumberSchema,
  reviewSchema,
  reviewReceiptSchema,
  toVariantRecord,
} from './model';
import { legacyCommentSchema } from './legacyFeedback';
import type {
  Comment,
  Study,
  Review,
  ReviewReceipt,
  Submission,
} from './model';

const draftSchema = z.object({
  id: z.uuid(),
  comments: z.array(commentSchema).max(100),
});
type Draft = z.infer<typeof draftSchema>;
const newDraft = (): Draft => ({ id: crypto.randomUUID(), comments: [] });
const storageKey = (id: string) => `xuui:${id}:feedback-draft:v2`;
const storedDraftSchema = z.union([
  draftSchema,
  draftSchema.extend({ comments: z.array(legacyCommentSchema).max(100) }),
]);

async function reserveNumbers(
  ids: string[],
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const response = await fetch('/__xuui/reviews/comment-numbers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
    signal,
  });
  if (!response.ok)
    throw new Error(
      'Could not reserve comment numbers. Your comment is kept; try again.',
    );
  return z.record(z.uuid(), commentNumberSchema).parse(await response.json());
}

function readDraft(study: Study): Draft {
  try {
    const result = storedDraftSchema.safeParse(
      JSON.parse(
        localStorage.getItem(storageKey(study.id)) ??
          localStorage.getItem(`xuui:${study.id}:feedback-draft:v1`) ??
          'null',
      ),
    );
    if (result.success)
      return {
        ...result.data,
        comments: result.data.comments.filter((comment) =>
          study.variants.some((variant) => variant.id === comment.variantId),
        ),
      };
  } catch {
    /* A draft remains usable without browser storage. */
  }
  return newDraft();
}

export function useReviews(studies: Study[], study: Study) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(studies.map((item) => [item.id, readDraft(item)])),
  );
  const [reviews, setReviews] = useState<Review[]>([]);
  const [receipts, setReceipts] = useState<Record<string, ReviewReceipt>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [historyError, setHistoryError] = useState('');
  const [busy, setBusy] = useState<string[]>([]);
  const submitting = useRef(new Set<string>());
  const draft = drafts[study.id];
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => {
    for (const [id, value] of Object.entries(drafts)) {
      try {
        localStorage.setItem(storageKey(id), JSON.stringify(value));
      } catch {
        /* Optional draft persistence. */
      }
    }
  }, [drafts]);

  const loadHistory = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/__xuui/reviews', { signal });
      if (!response.ok) throw new Error('Could not load submitted reviews.');
      const records = z.array(reviewSchema).parse(await response.json());
      // A slow history read must not hide a review submitted while it was in flight.
      setReviews((previous) =>
        [
          ...new Map(
            [...records, ...previous].map((review) => [review.id, review]),
          ).values(),
        ].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      );
      setHistoryError('');
      const comments = Object.values(draftsRef.current)
        .flatMap((draft) => draft.comments)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const numbers = await reserveNumbers(
        comments.map((comment) => comment.id),
        signal,
      );
      if (signal?.aborted) return;
      setDrafts((previous) =>
        Object.fromEntries(
          Object.entries(previous).map(([id, draft]) => [
            id,
            {
              ...draft,
              comments: draft.comments.map((comment) =>
                numbers[comment.id]
                  ? { ...comment, number: numbers[comment.id] }
                  : comment,
              ),
            },
          ]),
        ),
      );
    } catch (error) {
      if (!signal?.aborted)
        setHistoryError(
          error instanceof Error
            ? error.message
            : 'Could not load submitted reviews.',
        );
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    void loadHistory(controller.signal);
    return () => controller.abort();
  }, []);

  const loadReceipts = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/__xuui/reviews/receipts', { signal });
      if (!response.ok) return;
      const values = z.array(reviewReceiptSchema).parse(await response.json());
      const next = Object.fromEntries(
        values.map((receipt) => [receipt.reviewId, receipt]),
      );
      setReceipts((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    } catch {
      /* A temporary connection failure leaves the last known receipt intact. */
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (!document.hidden) void loadReceipts(controller.signal);
    };
    refresh();
    const timer = window.setInterval(refresh, 2000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const save = async (comment: Comment): Promise<boolean> => {
    if (submitting.current.has(study.id)) return false;
    const parsed = commentSchema.safeParse(comment);
    if (
      !parsed.success ||
      (!draft.comments.some((item) => item.id === comment.id) &&
        draft.comments.length >= 100)
    ) {
      setErrors((previous) => ({
        ...previous,
        [study.id]:
          'Use up to 100 comments, with 4,000 characters per comment.',
      }));
      return false;
    }
    try {
      const numbers = await reserveNumbers([comment.id]);
      parsed.data.number = numbers[comment.id];
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        [study.id]:
          error instanceof Error
            ? error.message
            : 'Could not save the comment.',
      }));
      return false;
    }
    setErrors((previous) => ({ ...previous, [study.id]: '' }));
    setDrafts((previous) => {
      const current = previous[study.id];
      return {
        ...previous,
        [study.id]: {
          id: crypto.randomUUID(),
          comments: current.comments.some((item) => item.id === comment.id)
            ? current.comments.map((item) =>
                item.id === comment.id ? parsed.data : item,
              )
            : [...current.comments, parsed.data],
        },
      };
    });
    return true;
  };
  const remove = (id: string) => {
    if (submitting.current.has(study.id)) return;
    setDrafts((previous) => ({
      ...previous,
      [study.id]: {
        id: crypto.randomUUID(),
        comments: previous[study.id].comments.filter((item) => item.id !== id),
      },
    }));
  };
  const submit = async () => {
    if (!draft.comments.length || submitting.current.has(study.id)) return;
    submitting.current.add(study.id);
    setBusy((previous) => [...previous, study.id]);
    setErrors((previous) => ({ ...previous, [study.id]: '' }));
    const submission: Submission = {
      schemaVersion: 2,
      id: draft.id,
      studyId: study.id,
      variants: study.variants.map(toVariantRecord),
      comments: draft.comments,
    };
    try {
      const response = await fetch('/__xuui/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });
      const data: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          'Could not submit the review. Your comments are kept; try again.',
        );
      const review = reviewSchema.parse(data);
      setReviews((previous) => [
        review,
        ...previous.filter((item) => item.id !== review.id),
      ]);
      setDrafts((previous) => ({ ...previous, [study.id]: newDraft() }));
    } catch {
      setErrors((previous) => ({
        ...previous,
        [study.id]:
          'Could not submit the review. Your comments are kept; try again.',
      }));
    } finally {
      submitting.current.delete(study.id);
      setBusy((previous) => previous.filter((id) => id !== study.id));
    }
  };
  return {
    comments: draft.comments,
    reviews: reviews.filter((review) => review.studyId === study.id),
    receipts,
    error: errors[study.id] ?? '',
    historyError,
    reload: () => void loadHistory(),
    busy: busy.includes(study.id),
    save,
    remove,
    submit,
  };
}

export type ReviewState = ReturnType<typeof useReviews>;
