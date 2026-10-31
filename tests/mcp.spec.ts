import { expect, test } from '@playwright/test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { reviewSchema } from '../src/xuui/model';

async function connect(directory: string, modern = false) {
  const client = new Client(
    { name: 'xuui-acceptance', version: '1.0.0' },
    modern ? { versionNegotiation: { mode: { pin: '2026-07-28' } } } : {},
  );
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [
        resolve('src/xuui/mcp.ts'),
        '--project-dir',
        process.cwd(),
        '--review-dir',
        directory,
      ],
      // A host can launch the server from somewhere other than the consumer project.
      cwd: resolve('..'),
      stderr: 'pipe',
    }),
  );
  return client;
}

const listSchema = z.object({
  reviews: z.array(z.object({ id: z.uuid() })),
  nextOffset: z.number().nullable(),
});
const deliveredSchema = z.object({
  status: z.enum(['submitted', 'timeout']),
  review: reviewSchema.nullable(),
  knownReviewIds: z.array(z.uuid()),
});

async function knownReviews(client: Client, studyId: string) {
  const ids: string[] = [];
  let offset: number | null = 0;
  do {
    const result = await client.callTool({
      name: 'xuui_list_reviews',
      arguments: { studyId, offset, limit: 200 },
    });
    expect(result.isError).not.toBe(true);
    const list = listSchema.parse(result.structuredContent);
    ids.push(...list.reviews.map((review) => review.id));
    offset = list.nextOffset;
  } while (offset !== null);
  return ids;
}

test('a browser review reaches a waiting MCP agent and remains readable after disconnecting', async ({
  page,
}) => {
  let client = await connect(resolve('.xuui-test/reviews'));
  try {
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual(
      [
        'xuui_acknowledge_review',
        'xuui_list_reviews',
        'xuui_read_review',
        'xuui_wait_for_review',
      ].sort(),
    );
    expect(
      tools.tools
        .filter((tool) => tool.name !== 'xuui_acknowledge_review')
        .every((tool) => tool.annotations?.readOnlyHint === true),
    ).toBe(true);
    expect(
      tools.tools.find((tool) => tool.name === 'xuui_acknowledge_review')
        ?.annotations?.readOnlyHint,
    ).toBe(false);
    let known = await knownReviews(client, 'card-exploration');
    await page.goto('/?variant=paper-v1');
    const add = async (text: string) => {
      await page
        .getByRole('button', { name: 'Comment mode', exact: true })
        .click();
      await page.locator('[data-xuui-design] h2').click();
      const editor = page.getByRole('dialog', { name: 'Element comment' });
      await editor
        .getByRole('textbox', { name: 'Comment', exact: true })
        .fill(text);
      await editor
        .getByRole('button', { name: 'Add comment', exact: true })
        .click();
    };
    await add('Make this heading easier to scan.');
    const beforeSubmit = deliveredSchema.parse(
      (
        await client.callTool({
          name: 'xuui_wait_for_review',
          arguments: {
            studyId: 'card-exploration',
            knownReviewIds: known,
            timeoutSeconds: 1,
          },
        })
      ).structuredContent,
    );
    expect(beforeSubmit.status).toBe('timeout');
    expect(beforeSubmit.review).toBeNull();

    const waiting = client.callTool({
      name: 'xuui_wait_for_review',
      arguments: {
        studyId: 'card-exploration',
        knownReviewIds: known,
        timeoutSeconds: 10,
      },
    });
    const posted = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/__xuui/reviews'),
    );
    await page
      .getByRole('button', { name: 'Submit review', exact: true })
      .click();
    const saved = reviewSchema.parse(await (await posted).json());
    const delivered = deliveredSchema.parse((await waiting).structuredContent);
    expect(delivered.status).toBe('submitted');
    expect(delivered.review).toEqual(saved);
    expect(
      JSON.parse(
        await readFile(
          resolve('.xuui-test/reviews', `${saved.id}.json`),
          'utf8',
        ),
      ),
    ).toEqual(saved);
    known = delivered.knownReviewIds;
    const row = page.locator(`[data-review-id="${saved.id}"]`);
    await expect(row).toContainText('Awaiting agent');
    const acknowledged = await client.callTool({
      name: 'xuui_acknowledge_review',
      arguments: { reviewId: saved.id },
    });
    expect(acknowledged.isError).not.toBe(true);
    const repeated = await client.callTool({
      name: 'xuui_acknowledge_review',
      arguments: { reviewId: saved.id },
    });
    expect(repeated.structuredContent).toEqual(acknowledged.structuredContent);
    await expect(row).toContainText('Read by agent');
    const filter = page.getByRole('group', {
      name: 'Comment filter',
      exact: true,
    });
    await filter.getByRole('button', { name: 'Unread', exact: true }).click();
    await expect(row).toHaveCount(0);
    await filter.getByRole('button', { name: 'All', exact: true }).click();
    await expect(row).toContainText('Read by agent');
    expect(
      JSON.parse(
        await readFile(
          resolve('.xuui-test/reviews', `${saved.id}.json`),
          'utf8',
        ),
      ),
    ).toEqual(saved);
    const unread = listSchema.parse(
      (
        await client.callTool({
          name: 'xuui_list_reviews',
          arguments: { unreadOnly: true, limit: 200 },
        })
      ).structuredContent,
    );
    expect(unread.reviews.map((review) => review.id)).not.toContain(saved.id);
    await client.close();

    // Submit while no agent is connected. Reconnect from a different protocol era.
    await add('Keep the stronger title treatment.');
    const offlinePost = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/__xuui/reviews'),
    );
    await page
      .getByRole('button', { name: 'Submit review', exact: true })
      .click();
    const offline = reviewSchema.parse(await (await offlinePost).json());
    client = await connect(resolve('.xuui-test/reviews'), true);
    const read = await client.callTool({
      name: 'xuui_read_review',
      arguments: { reviewId: saved.id },
    });
    expect(
      z.object({ review: reviewSchema }).parse(read.structuredContent).review,
    ).toEqual(saved);
    await page.reload();
    await expect(page.locator(`[data-review-id="${saved.id}"]`)).toContainText(
      'Read by agent',
    );
    const recovered = deliveredSchema.parse(
      (
        await client.callTool({
          name: 'xuui_wait_for_review',
          arguments: {
            studyId: 'card-exploration',
            knownReviewIds: known,
            timeoutSeconds: 1,
          },
        })
      ).structuredContent,
    );
    expect(recovered.review).toEqual(offline);
  } finally {
    await client.close();
  }
});

test('MCP waits handle missing folders, exclude drafts, validate IDs, and cancel without blocking later reads', async () => {
  const directory = resolve(
    '.xuui-test',
    `mcp-${crypto.randomUUID()}`,
    'reviews',
  );
  const client = await connect(directory);
  try {
    const empty = await client.callTool({
      name: 'xuui_list_reviews',
      arguments: {},
    });
    expect(listSchema.parse(empty.structuredContent).reviews).toEqual([]);
    await mkdir(directory, { recursive: true });
    await writeFile(
      resolve(directory, '.pending.tmp'),
      '{not a submitted review',
    );
    const timedOut = deliveredSchema.parse(
      (
        await client.callTool({
          name: 'xuui_wait_for_review',
          arguments: { knownReviewIds: [], timeoutSeconds: 1 },
        })
      ).structuredContent,
    );
    expect(timedOut.status).toBe('timeout');
    const missing = await client.callTool({
      name: 'xuui_read_review',
      arguments: { reviewId: crypto.randomUUID() },
    });
    expect(missing.isError).toBe(true);
    expect(
      (
        await client.callTool({
          name: 'xuui_acknowledge_review',
          arguments: { reviewId: crypto.randomUUID() },
        })
      ).isError,
    ).toBe(true);
    const invalid = await client.callTool({
      name: 'xuui_read_review',
      arguments: { reviewId: '../outside' },
    });
    expect(invalid.isError).toBe(true);
    const controller = new AbortController();
    const waiting = client.callTool(
      { name: 'xuui_wait_for_review', arguments: { timeoutSeconds: 45 } },
      { signal: controller.signal },
    );
    controller.abort();
    await expect(waiting).rejects.toThrow();
    const afterCancel = await client.callTool({
      name: 'xuui_list_reviews',
      arguments: {},
    });
    expect(listSchema.parse(afterCancel.structuredContent).reviews).toEqual([]);
  } finally {
    await client.close();
  }
});
