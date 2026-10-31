import { expect, test } from '@playwright/test';

test('the approved example shares the production card, retains its annotation target, and supports the comment workflow', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?study=comment-system&variant=comments-threads-v1');
  const example = page.locator('.comments-example');
  await expect(example).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Next variant', exact: true }),
  ).toBeDisabled();
  // This is the target path stored with the user's approval of the example.
  const target = page.locator(
    '[data-variant-id="comments-threads-v1"] [data-xuui-design] > section:nth-of-type(1) > div:nth-of-type(2) > ol:nth-of-type(1) > li:nth-of-type(1)',
  );
  await expect(target).toHaveAttribute('data-comment-id', 'heading');
  await expect(target).toContainText('Give the heading a little more room.');
  await page
    .getByRole('button', { name: 'Interact with preview', exact: true })
    .click();
  await example.getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(example.getByText(/Give the heading/)).toBeVisible();
  await expect(
    example.getByText('The description can be quieter than the headline.'),
  ).toHaveCount(0);
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  await sidebar
    .getByRole('combobox', { name: 'Delivery', exact: true })
    .click();
  await page
    .getByRole('option', { name: 'Read by agent', exact: true })
    .click();
  await expect(example).toContainText('All reviews have been read.');
  await example.getByRole('button', { name: 'All', exact: true }).click();
  await example
    .getByRole('button', { name: 'Write a comment', exact: true })
    .click();
  await example
    .getByRole('textbox', { name: 'Comment', exact: true })
    .fill('Keep comments readable without expanding a review.');
  await example
    .getByRole('button', { name: 'Add to review', exact: true })
    .click();
  await example
    .getByRole('button', { name: 'Submit review', exact: true })
    .click();
  await example.getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(example).toContainText(
    'Keep comments readable without expanding a review.',
  );
  await expect(example.getByText(/Give the heading/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Comment mode', exact: true }).click();
  await example
    .getByText('Keep comments readable without expanding a review.')
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Element comment' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('the approved card stays readable with long comments, narrow widths, RTL, and 200% zoom', async ({
  page,
}) => {
  await page.goto('/?study=comment-system&variant=comments-threads-v1');
  await page
    .getByRole('complementary', { name: 'Sidebar' })
    .getByRole('switch', { name: 'Long comments?', exact: true })
    .click();
  const example = page.locator('.comments-example');
  for (const width of [320, 375, 720, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await example.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    expect((await example.boundingBox())!.width).toBeLessThanOrEqual(
      width - 64,
    );
  }
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
  });
  expect(
    await example.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.dir = 'ltr';
  });
  const width = (await example.boundingBox())!.width;
  await example.evaluate((element: HTMLElement) => {
    element.style.zoom = '2';
  });
  expect((await example.boundingBox())!.width).toBeCloseTo(width * 2, 1);
  const canvas = (await page
    .getByRole('region', { name: 'Canvas', exact: true })
    .boundingBox())!;
  await page.mouse.move(canvas.x + 40, canvas.y + 100);
  await page.mouse.wheel(0, -400);
  await expect(
    example.getByRole('button', { name: 'Write a comment', exact: true }),
  ).toBeInViewport();
});
