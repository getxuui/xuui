import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { version } from '../version.ts';
import { formatReview, reviewSchema, reviewReceiptSchema } from './model.ts';
import type { Review } from './model.ts';
import {
  readReview,
  readReviews,
  readReviewReceipts,
  acknowledgeReview,
} from './reviewStore.ts';

const { values } = parseArgs({
  options: {
    'project-dir': { type: 'string', default: process.cwd() },
    'review-dir': { type: 'string' },
    help: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.error(
    'xuui MCP: node src/xuui/mcp.ts --project-dir /path/to/workspace [--review-dir .xuui/reviews]',
  );
} else {
  const directory = resolve(
    values['project-dir'],
    values['review-dir'] ?? process.env.XUUI_REVIEW_DIR ?? '.xuui/reviews',
  );
  const filters = {
    studyId: z
      .string()
      .min(1)
      .max(300)
      .optional()
      .describe('Only packages submitted for this study.'),
    variantId: z
      .string()
      .min(1)
      .max(300)
      .optional()
      .describe(
        'Only packages containing this variant. The complete submitted package is returned.',
      ),
  };
  const annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
  const summarySchema = z.object({
    id: z.uuid(),
    studyId: z.string(),
    submittedAt: z.iso.datetime(),
    variantIds: z.array(z.string()),
    commentCount: z.number().int(),
    readAt: z.iso.datetime().nullable(),
  });
  const packageResult = (review: Review) => ({
    content: [{ type: 'text' as const, text: formatReview(review) }],
    structuredContent: { review },
  });

  const handle = serveStdio(
    () => {
      const server = new McpServer(
        { name: 'xuui', version },
        {
          instructions:
            'xuui presents studies containing variants. Browser drafts are never delivered. List unread reviews, read the full package, then call xuui_acknowledge_review once you have received it. Acknowledgement records Read by agent and clears the unread queue; it does not mean the feedback is implemented. History is retained. After handing off a review link, keep calling xuui_wait_for_review for that study, passing the returned knownReviewIds, until a review arrives or the person asks you to stop; this server cannot wake an idle agent, so waiting is how feedback reaches you without being asked for. Acknowledge each received package, make changes as new variants with new IDs, hand off the new link, and wait again. Give each variant a stable ID and a rationale explaining its design choice. This server does not edit designs.',
        },
      );
      const matching = async ({
        studyId,
        variantId,
      }: {
        studyId?: string;
        variantId?: string;
      }) =>
        (await readReviews(directory)).filter(
          (review) =>
            (!studyId || review.studyId === studyId) &&
            (!variantId ||
              review.comments.some(
                (comment) => comment.variantId === variantId,
              )),
        );

      server.registerTool(
        'xuui_list_reviews',
        {
          title: 'List submitted xuui reviews',
          description:
            'List durable, explicitly submitted review packages, newest first. Use unreadOnly for the agent inbox. readAt is the first agent acknowledgement timestamp, or null. Browser drafts are excluded. Paginate using nextOffset, and use xuui_read_review to retrieve complete feedback.',
          inputSchema: z.object({
            ...filters,
            unreadOnly: z.boolean().default(false),
            offset: z.number().int().min(0).default(0),
            limit: z.number().int().min(1).max(200).default(50),
          }),
          outputSchema: z.object({
            reviews: z.array(summarySchema),
            total: z.number().int(),
            nextOffset: z.number().int().nullable(),
          }),
          annotations,
        },
        async ({ studyId, variantId, unreadOnly, offset, limit }) => {
          const receipts = new Map(
            (await readReviewReceipts(directory)).map((receipt) => [
              receipt.reviewId,
              receipt.readAt,
            ]),
          );
          const reviews = (await matching({ studyId, variantId })).filter(
            (review) => !unreadOnly || !receipts.has(review.id),
          );
          const result = {
            reviews: reviews.slice(offset, offset + limit).map((review) => ({
              id: review.id,
              studyId: review.studyId,
              submittedAt: review.submittedAt,
              variantIds: [
                ...new Set(review.comments.map((comment) => comment.variantId)),
              ],
              commentCount: review.comments.length,
              readAt: receipts.get(review.id) ?? null,
            })),
            total: reviews.length,
            nextOffset: offset + limit < reviews.length ? offset + limit : null,
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
          };
        },
      );

      server.registerTool(
        'xuui_acknowledge_review',
        {
          title: 'Mark a xuui review read by agent',
          description:
            'Call after receiving and reading a complete review. Saves a durable Read by agent receipt and clears it from the unread queue. This acknowledges receipt only; it does not claim the requested work is complete. Comments and review history remain unchanged. Repeated acknowledgements retain the first read timestamp.',
          inputSchema: z.object({ reviewId: z.uuid() }),
          outputSchema: z.object({ receipt: reviewReceiptSchema }),
          annotations: { ...annotations, readOnlyHint: false },
        },
        async ({ reviewId }) => {
          const receipt = await acknowledgeReview(directory, reviewId);
          if (!receipt)
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `No submitted review has ID ${reviewId}.`,
                },
              ],
            };
          return {
            content: [{ type: 'text', text: JSON.stringify(receipt, null, 2) }],
            structuredContent: { receipt },
          };
        },
      );

      server.registerTool(
        'xuui_read_review',
        {
          title: 'Read a submitted xuui review',
          description:
            'Read a complete submitted package by reviewId, including variant identities, rationale, target context, and Agentation annotations. This is the same feedback shown and copied from the studio.',
          inputSchema: z.object({ reviewId: z.uuid() }),
          outputSchema: z.object({ review: reviewSchema }),
          annotations,
        },
        async ({ reviewId }) => {
          const review = await readReview(directory, reviewId);
          if (!review)
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `No submitted review has ID ${reviewId}. Use xuui_list_reviews to find available reviews.`,
                },
              ],
            };
          return packageResult(review);
        },
      );

      server.registerTool(
        'xuui_wait_for_review',
        {
          title: 'Wait for a submitted xuui review',
          description:
            'Wait for the oldest unread submission not in knownReviewIds. Acknowledged reviews are excluded. Call xuui_acknowledge_review after receiving a package. Without knownReviewIds, existing unread submissions also return immediately, including those submitted while disconnected. Carry returned knownReviewIds into the next call. Stops after at most 50 seconds and supports cancellation. Only explicit studio submissions are delivered.',
          inputSchema: z.object({
            ...filters,
            knownReviewIds: z.array(z.uuid()).max(10000).optional(),
            timeoutSeconds: z.number().int().min(1).max(50).default(45),
          }),
          outputSchema: z.object({
            status: z.enum(['submitted', 'timeout']),
            review: reviewSchema.nullable(),
            knownReviewIds: z.array(z.uuid()),
          }),
          annotations,
        },
        async (
          { studyId, variantId, knownReviewIds, timeoutSeconds },
          context,
        ) => {
          const signal = context.mcpReq.signal;
          let reviews = await matching({ studyId, variantId });
          const known = new Set(knownReviewIds ?? []);
          const deadline = Date.now() + timeoutSeconds * 1000;
          while (true) {
            signal.throwIfAborted();
            const readIds = new Set(
              (await readReviewReceipts(directory)).map(
                (receipt) => receipt.reviewId,
              ),
            );
            const review = reviews.findLast(
              (item) => !known.has(item.id) && !readIds.has(item.id),
            );
            if (review) {
              known.add(review.id);
              return {
                ...packageResult(review),
                structuredContent: {
                  status: 'submitted',
                  review,
                  knownReviewIds: [...known],
                },
              };
            }
            const remaining = deadline - Date.now();
            if (remaining <= 0) {
              const result = {
                status: 'timeout' as const,
                review: null,
                knownReviewIds: [...known],
              };
              return {
                content: [
                  {
                    type: 'text',
                    text: 'No new review was submitted before the timeout. Call again with these knownReviewIds to continue waiting.',
                  },
                ],
                structuredContent: result,
              };
            }
            await delay(Math.min(500, remaining), undefined, { signal });
            reviews = await matching({ studyId, variantId });
          }
        },
      );
      return server;
    },
    { onerror: (error) => console.error(`[xuui MCP] ${error.message}`) },
  );
  process.once('SIGINT', () => void handle.close());
  process.once('SIGTERM', () => void handle.close());
}
