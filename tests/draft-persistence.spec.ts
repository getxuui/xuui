import { expect, test } from '@playwright/test';

const key = 'xuui:card-exploration:feedback-draft:v2';
const comment = (variantId: string, body: string) => ({
  id: crypto.randomUUID(),
  variantId,
  body,
  target: {
    selector: `[data-variant-id="${variantId}"] [data-xuui-design] h2`,
    tagName: 'h2',
    accessibleName: 'Title',
    text: 'Title',
    bounds: { x: 0, y: 0, width: 100, height: 40 },
    viewport: { width: 1440, height: 1000 },
  },
  createdAt: new Date().toISOString(),
});

test('draft comments survive a reload that cannot show every one', async ({
  page,
}) => {
  const kept = comment('paper-v1', 'Visible after reload.');
  const orphan = comment('removed-v9', 'Its variant is missing for now.');
  const unreadable = { ...comment('paper-v1', 'From another schema.'), x: 1 };
  await page.goto('/?variant=paper-v1');
  await page.evaluate(
    ([name, draft]) => localStorage.setItem(name, JSON.stringify(draft)),
    [
      key,
      { id: crypto.randomUUID(), comments: [kept, orphan, unreadable] },
    ] as const,
  );
  await page.reload();
  const drafts = page.getByRole('list', { name: 'Draft comments' });
  await expect(drafts.getByRole('listitem')).toHaveCount(1);
  await expect(drafts).toContainText(kept.body);
  // The registry returning the variant, or a newer build, restores the rest.
  const stored = await page.evaluate(
    (name) => ({
      draft: JSON.parse(localStorage.getItem(name) ?? 'null'),
      unreadable: localStorage.getItem(`${name}:unreadable`),
    }),
    key,
  );
  expect(stored.draft.comments.map((item: { id: string }) => item.id)).toEqual(
    expect.arrayContaining([kept.id, orphan.id]),
  );
  expect(stored.unreadable).toContain(unreadable.id);
});

test('a draft comment and its pin survive a browser reload', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await page.keyboard.press('c');
  await page.locator('[data-xuui-design] h2').click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  await editor.getByPlaceholder('Add a comment').fill('Survive the reload.');
  await editor
    .getByRole('button', { name: 'Add comment', exact: true })
    .click();
  const drafts = page.getByRole('list', { name: 'Draft comments' });
  await expect(drafts).toContainText('Survive the reload.');
  await page.reload();
  await expect(drafts).toContainText('Survive the reload.');
  await page.keyboard.press('c');
  await expect(page.locator('[data-comment-pin]')).toHaveCount(1);
});
