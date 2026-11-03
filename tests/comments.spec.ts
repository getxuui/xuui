import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function commentOnHeading(page: Page, body: string) {
  await page.getByRole('button', { name: 'Comment mode', exact: true }).click();
  await page.locator('[data-xuui-design] h2').click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  await expect(editor).toBeVisible();
  await editor.getByPlaceholder('Add a comment').fill(body);
  await editor
    .getByRole('button', { name: 'Add comment', exact: true })
    .click();
  await expect(editor).toHaveCount(0);
}

test('saved alpha drafts become variant comments and stay empty after submission', async ({
  page,
}) => {
  const legacy = {
    id: crypto.randomUUID(),
    comments: [
      {
        id: crypto.randomUUID(),
        iterationId: 'paper-v1',
        body: 'Keep this feedback from the first alpha.',
        createdAt: new Date().toISOString(),
        target: {
          selector: '[data-variant-id="paper-v1"] [data-xuui-design] h2',
          tagName: 'h2',
          accessibleName: 'Title',
          text: 'Title',
          bounds: { x: 0, y: 0, width: 100, height: 40 },
          viewport: { width: 1440, height: 1000 },
        },
      },
    ],
  };
  await page.addInitScript((draft) => {
    const key = 'xuui:card-exploration:feedback-draft:v1';
    if (localStorage.getItem(key) === null)
      localStorage.setItem(key, JSON.stringify(draft));
  }, legacy);
  await page.goto('/?variant=paper-v1');
  const drafts = page.getByRole('list', { name: 'Draft comments' });
  await expect(drafts.getByRole('listitem')).toHaveCount(1);
  await expect(drafts).toContainText(legacy.comments[0].body);
  const posted = page.waitForResponse(
    (response) =>
      response.url().endsWith('/__xuui/reviews') &&
      response.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Submit review', exact: true })
    .click();
  const response = await posted;
  expect(response.status()).toBe(201);
  const saved = await response.json();
  expect(saved).toMatchObject({
    schemaVersion: 2,
    studyId: 'card-exploration',
    comments: [{ variantId: 'paper-v1', body: legacy.comments[0].body }],
  });
  expect(saved.variants).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: 'paper-v1' })]),
  );
  await expect(drafts.getByRole('listitem')).toHaveCount(0);
  await page.reload();
  await expect(drafts.getByRole('listitem')).toHaveCount(0);
});

test('comment editor validates empty comments and saves with the keyboard', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await page.keyboard.press('c');
  await page.locator('[data-xuui-design] h2').click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  const input = editor.getByRole('textbox', { name: 'Comment', exact: true });
  await expect(input).toBeFocused();
  await input.press('Control+Enter');
  await expect(editor.getByRole('alert')).toHaveText(
    'Write a comment before adding it.',
  );
  await expect(input).toBeFocused();
  await input.fill('Make the title easier to scan.');
  await expect(editor.getByRole('alert')).toHaveCount(0);
  await input.press('Control+Enter');
  await expect(editor).toHaveCount(0);
  await expect(
    page.getByRole('list', { name: 'Draft comments' }),
  ).toContainText('Make the title easier to scan.');
});

test('outside clicks dismiss a new comment and retain its text for the next opening in that variant', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await page.keyboard.press('c');
  const heading = page.locator('[data-xuui-design] h2');
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  const input = editor.getByRole('textbox', { name: 'Comment', exact: true });
  const drafts = page.getByRole('list', { name: 'Draft comments' });
  const open = () => heading.click({ position: { x: 5, y: 5 } });
  await open();
  await input.fill('Keep this unfinished thought.');
  await heading.click({ position: { x: 50, y: 5 } });
  await expect(editor).toHaveCount(0);
  await expect(drafts.getByRole('listitem')).toHaveCount(0);
  await open();
  await expect(input).toHaveValue('Keep this unfinished thought.');
  await page.getByRole('link', { name: 'After hours', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page).toHaveURL(/variant=after-hours-v1/);
  await open();
  await expect(input).toHaveValue('');
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'Paper', exact: true }).click();
  await open();
  await expect(input).toHaveValue('Keep this unfinished thought.');
  await editor
    .getByRole('button', { name: 'Add comment', exact: true })
    .click();
  await expect(drafts).toContainText('Keep this unfinished thought.');
  await heading.click({ position: { x: 50, y: 5 } });
  await expect(input).toHaveValue('');
});

test('dismissing an edit keeps its text without changing the saved comment, and Cancel discards the edit', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await commentOnHeading(page, 'Original comment.');
  const pin = page.locator('[data-comment-pin]');
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  const input = editor.getByRole('textbox', { name: 'Comment', exact: true });
  await pin.click();
  await input.fill('Unfinished edit.');
  await page.getByRole('main', { name: 'Variant canvas', exact: true }).click({
    position: { x: 30, y: 30 },
  });
  await expect(editor).toHaveCount(0);
  await expect(
    page.getByRole('list', { name: 'Draft comments' }),
  ).toContainText('Original comment.');
  await pin.click();
  await expect(input).toHaveValue('Unfinished edit.');
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await pin.click();
  await expect(input).toHaveValue('Original comment.');
});

test('Agentation comments collect across variants, edit, persist, and submit as the same copyable file record', async ({
  page,
  context,
  request,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?variant=paper-v1');
  await commentOnHeading(page, 'Give this heading more room.');
  const drafts = page.getByRole('list', { name: 'Draft comments' });
  await expect(drafts.getByRole('listitem')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Edit comment 1', exact: true })
    .click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  await editor
    .getByPlaceholder('Add a comment')
    .fill('Give this heading 8px more room.');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(drafts).toContainText('Give this heading 8px more room.');
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/variant=after-hours-v1/);
  await expect(page.locator('[data-comment-pin]')).toHaveCount(0);
  await commentOnHeading(page, 'Keep this darker direction.');
  await expect(drafts.getByRole('listitem')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Edit comment 1', exact: true })
    .click();
  await expect(page).toHaveURL(/variant=paper-v1/);
  await expect(editor.getByPlaceholder('Add a comment')).toHaveValue(
    'Give this heading 8px more room.',
  );
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await page.reload();
  await expect(drafts.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Comment mode', exact: true }).click();
  await expect(page.locator('[data-comment-pin]')).toHaveCount(1);
  const posted = page.waitForResponse(
    (response) =>
      response.url().endsWith('/__xuui/reviews') &&
      response.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Submit review', exact: true })
    .click();
  const response = await posted;
  expect(response.status()).toBe(201);
  const saved = await response.json();
  expect(
    saved.comments.map((comment: { variantId: string }) => comment.variantId),
  ).toEqual(['paper-v1', 'after-hours-v1']);
  expect(saved.comments[0].agentation.comment).toBe(
    'Give this heading 8px more room.',
  );
  expect(saved.comments[0].agentation.elementPath).toContain(
    'data-variant-id="paper-v1"',
  );
  expect(saved.comments[0].target.tagName).toBe('h2');
  const stored = JSON.parse(
    await readFile(resolve('.xuui-test/reviews', `${saved.id}.json`), 'utf8'),
  );
  expect(stored).toEqual(saved);
  await expect(drafts.getByRole('listitem')).toHaveCount(0);
  const submittedCards = page.locator(`[data-review-id="${saved.id}"]`);
  await expect(submittedCards).toHaveCount(2);
  await expect(submittedCards.first()).toContainText(
    'Give this heading 8px more room.',
  );
  await expect(submittedCards.last()).toContainText(
    'Keep this darker direction.',
  );
  const reviewCopy = page
    .getByRole('button', { name: 'Copy submitted review', exact: true })
    .first();
  await reviewCopy.click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(saved.id);
  expect(JSON.parse(copied.split('Full record:\n')[1])).toEqual(saved);
  expect(await (await request.get('/__xuui/reviews')).json()).toContainEqual(
    saved,
  );
  await page.reload();
  await expect(
    page.getByRole('list', { name: 'Submitted comments' }),
  ).toContainText('Keep this darker direction.');
});

test('drafts stay with their study, cancel and delete work, and All variants binds comments to the clicked variant', async ({
  page,
}) => {
  await page.goto('/?study=sunday-tickets&variant=ticket-botanical-v1');
  await page.keyboard.press('c');
  await page.locator('[data-xuui-design] h2').click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  await editor
    .getByPlaceholder('Add a comment')
    .fill('Discard this unsaved comment.');
  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
  const drafts = page.getByRole('list', { name: 'Draft comments' });
  await expect(drafts.getByRole('listitem')).toHaveCount(0);
  await commentOnHeading(page, 'Keep the ticket treatment.');
  await page.locator('[data-comment-pin]').click();
  await editor
    .getByRole('button', { name: 'Delete annotation', exact: true })
    .click();
  await expect(drafts.getByRole('listitem')).toHaveCount(0);
  await commentOnHeading(page, 'Make this ticket title smaller.');
  const studyPicker = page.getByRole('combobox', {
    name: 'Study',
    exact: true,
  });
  await studyPicker.click();
  await page
    .getByRole('option', { name: 'Card exploration', exact: true })
    .click();
  await expect(drafts.getByRole('listitem')).toHaveCount(0);
  await commentOnHeading(page, 'Keep this card title.');
  await page.getByRole('link', { name: 'All variants', exact: true }).click();
  await page
    .locator('[data-variant-id="after-hours-v1"] h2')
    .click({ position: { x: 5, y: 5 } });
  await editor
    .getByPlaceholder('Add a comment')
    .fill('This comment belongs to After hours.');
  await editor
    .getByRole('button', { name: 'Add comment', exact: true })
    .click();
  await expect(page).toHaveURL(/variant=paper-v1&view=all/);
  await expect(drafts).toContainText('After hours');
  await expect(page.locator('[data-comment-pin]')).toHaveCount(2);
  await studyPicker.click();
  await page
    .getByRole('option', { name: 'Sunday tickets', exact: true })
    .click();
  await expect(drafts.getByRole('listitem')).toHaveCount(1);
  await expect(drafts).toContainText('Make this ticket title smaller.');
  const posted = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/__xuui/reviews'),
  );
  await page
    .getByRole('button', { name: 'Submit review', exact: true })
    .click();
  const response = await posted;
  expect(response.status()).toBe(201);
  const review = await response.json();
  expect(review.studyId).toBe('sunday-tickets');
  expect(review.comments[0].variantId).toBe('ticket-botanical-v1');
});

test('comment pins follow pan and zoom, annotation mode blocks interactions, and a failed submission keeps drafts', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await page
    .getByRole('button', { name: 'Interact with preview', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save a seat', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'You’re on the list', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Comment mode', exact: true }).click();
  await page
    .getByRole('button', { name: 'You’re on the list', exact: true })
    .click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  await editor
    .getByPlaceholder('Add a comment')
    .fill('Keep the reserved state clear.');
  await editor
    .getByRole('button', { name: 'Add comment', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'You’re on the list', exact: true }),
  ).toBeVisible();
  const pin = page.locator('[data-comment-pin]');
  const target = page.locator('[data-xuui-design] .reserve-button');
  const offset = async () => {
    const p = (await pin.boundingBox())!;
    const t = (await target.boundingBox())!;
    return { x: (p.x + 3 - t.x) / t.width, y: (p.y + 3 - t.y) / t.height };
  };
  const initial = await offset();
  const canvas = page.getByRole('region', { name: 'Canvas', exact: true });
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + 90, bounds.y + 150);
  await page.mouse.wheel(70, 40);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -20);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => Math.abs((await offset()).x - initial.x))
    .toBeLessThan(0.01);
  await expect
    .poll(async () => Math.abs((await offset()).y - initial.y))
    .toBeLessThan(0.01);
  await page.route('**/__xuui/reviews', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 500, json: { error: 'Unavailable' } })
      : route.continue(),
  );
  await page
    .getByRole('button', { name: 'Submit review', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Your comments are kept');
  await expect(
    page.getByRole('list', { name: 'Draft comments' }).getByRole('listitem'),
  ).toHaveCount(1);
  await page.unroute('**/__xuui/reviews');
  await page
    .getByRole('button', { name: 'Submit review', exact: true })
    .click();
  await expect(
    page.getByRole('list', { name: 'Draft comments' }).getByRole('listitem'),
  ).toHaveCount(0);
});

test('comment cards lead with their number, open their comment, and pins keep up with the canvas', async ({
  page,
}) => {
  await page.goto('/?variant=paper-v1');
  await commentOnHeading(page, 'Tighten the heading.');
  const drafts = page.getByRole('list', { name: 'Draft comments' });
  const number = drafts.getByRole('button', { name: /^Open comment 1: / });
  await expect(number).toHaveText('1');
  await expect(number).toHaveAccessibleName(/Paper \//);

  // Clicking the card reopens the comment with the caret after its text.
  await number.click();
  const editor = page.getByRole('dialog', { name: 'Element comment' });
  const field = editor.getByRole('textbox', { name: 'Comment', exact: true });
  await expect(field).toBeFocused();
  expect(
    await field.evaluate(
      (element: HTMLTextAreaElement) =>
        element.selectionStart === element.value.length &&
        element.selectionEnd === element.value.length,
    ),
  ).toBe(true);
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();

  // A pin moves in the same frame as the canvas, not on a later render.
  const moved = await page.evaluate(() => {
    const pin = document.querySelector('[data-comment-pin]')!;
    const heading = document.querySelector('[data-xuui-design] h2')!;
    const before = [pin, heading].map((item) => item.getBoundingClientRect().x);
    document.querySelector('main[aria-label="Variant canvas"]')!.dispatchEvent(
      new WheelEvent('wheel', {
        deltaX: 120,
        bubbles: true,
        cancelable: true,
      }),
    );
    const after = [pin, heading].map((item) => item.getBoundingClientRect().x);
    return { pin: after[0] - before[0], heading: after[1] - before[1] };
  });
  expect(moved.heading).toBe(-120);
  expect(moved.pin).toBe(moved.heading);

  // A submitted comment opens by selecting the element it points at.
  await page
    .getByRole('button', { name: 'Submit review', exact: true })
    .click();
  const submitted = page.getByRole('list', { name: 'Submitted comments' });
  await submitted
    .getByRole('button', { name: /^Open comment 1: / })
    .first()
    .click();
  await expect(
    page.getByRole('region', { name: 'Selected layer' }),
  ).toBeVisible();
});
