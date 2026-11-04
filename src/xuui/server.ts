import { resolve } from 'node:path';
import { z } from 'zod';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { submissionSchema } from './model.ts';
import { readReviews, saveReview, readReviewReceipts } from './reviewStore.ts';
import { commentNumber } from './commentNumbers.ts';

const endpoint = '/__xuui/reviews';
const maxBodyBytes = 512 * 1024;

function reply(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += Buffer.byteLength(chunk);
    if (size > maxBodyBytes)
      throw new Error('Review is too large. Limit reviews to 512 KB.');
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Local-only Vite integration; history is ordinary, Git-friendly JSON. */
export function xuuiReviewServer(options: {
  studyId?: string;
  directory?: string;
}): Plugin {
  let directory: string;
  return {
    name: 'xuui-review-server',
    configResolved(config) {
      directory = resolve(config.root, options.directory ?? '.xuui/reviews');
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split('?')[0];
        if (
          pathname !== endpoint &&
          pathname !== `${endpoint}/receipts` &&
          pathname !== `${endpoint}/comment-numbers`
        )
          return next();
        void (async () => {
          // Same-origin writes only. Review files stay on this machine.
          const origin = request.headers.origin;
          if (origin && origin !== `http://${request.headers.host}`) {
            reply(response, 403, {
              error:
                'Open the review interface on this local server to submit feedback.',
            });
            return;
          }
          if (pathname === `${endpoint}/comment-numbers`) {
            if (request.method !== 'POST') {
              reply(response, 405, {
                error: 'Use POST to reserve comment numbers.',
              });
              return;
            }
            if (
              !request.headers['content-type']?.startsWith('application/json')
            ) {
              reply(response, 415, {
                error: 'Use application/json for comment numbers.',
              });
              return;
            }
            let input: unknown;
            try {
              input = await readBody(request);
            } catch {
              reply(response, 400, { error: 'Send valid comment IDs.' });
              return;
            }
            const parsed = z
              .object({ ids: z.array(z.uuid()).min(1).max(1000) })
              .strict()
              .safeParse(input);
            if (!parsed.success) {
              reply(response, 400, { error: 'Send valid comment IDs.' });
              return;
            }
            await readReviews(directory);
            const numbers: Record<string, number> = {};
            for (const id of parsed.data.ids)
              numbers[id] = await commentNumber(directory, id);
            reply(response, 200, numbers);
            return;
          }
          if (pathname === `${endpoint}/receipts`) {
            if (request.method !== 'GET') {
              reply(response, 405, {
                error: 'Read receipts are acknowledged through MCP.',
              });
              return;
            }
            let receipts = await readReviewReceipts(directory);
            if (options.studyId) {
              const ids = new Set(
                (await readReviews(directory))
                  .filter((review) => review.studyId === options.studyId)
                  .map((review) => review.id),
              );
              receipts = receipts.filter((receipt) =>
                ids.has(receipt.reviewId),
              );
            }
            reply(response, 200, receipts);
            return;
          }
          if (request.method === 'GET') {
            reply(
              response,
              200,
              (await readReviews(directory)).filter(
                (review) =>
                  !options.studyId || review.studyId === options.studyId,
              ),
            );
            return;
          }
          if (request.method !== 'POST') {
            reply(response, 405, { error: 'Use GET or POST for reviews.' });
            return;
          }
          if (
            !request.headers['content-type']?.startsWith('application/json')
          ) {
            reply(response, 415, {
              error: 'Reviews must use application/json.',
            });
            return;
          }
          let input: unknown;
          try {
            input = await readBody(request);
          } catch {
            reply(response, 400, {
              error: 'Send a valid JSON review smaller than 512 KB.',
            });
            return;
          }
          const parsed = submissionSchema.safeParse(input);
          if (
            !parsed.success ||
            (options.studyId && parsed.data.studyId !== options.studyId)
          ) {
            reply(response, 400, {
              error:
                'Review is invalid. Include registered variants and at least one complete comment.',
            });
            return;
          }
          reply(response, 201, await saveReview(directory, parsed.data));
        })().catch((error: unknown) => {
          server.config.logger.error(
            `[xuui] ${error instanceof Error ? error.message : String(error)}`,
          );
          reply(response, 500, {
            error:
              'Could not read or save review files. Your draft is still available; check the server terminal and try again.',
          });
        });
      });
    },
  };
}
