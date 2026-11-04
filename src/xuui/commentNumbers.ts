import { mkdir, readdir, readFile, writeFile, link } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { commentNumberSchema } from './model.ts';

const recordSchema = z
  .object({ id: z.uuid(), number: commentNumberSchema })
  .strict();

/** Immutable reservations keep one workspace sequence, including deleted drafts. */
export async function commentNumber(
  directory: string,
  id: string,
): Promise<number> {
  z.uuid().parse(id);
  const folder = join(directory, 'comment-numbers');
  const identity = join(folder, `${id}.json`);
  try {
    return recordSchema.parse(JSON.parse(await readFile(identity, 'utf8')))
      .number;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await mkdir(folder, { recursive: true });
  const reserved = (await readdir(folder))
    .filter((name) => /^[1-9]\d*\.json$/.test(name))
    .map((name) => Number(name.slice(0, -5)));
  let number =
    reserved.reduce((maximum, value) => Math.max(maximum, value), 0) + 1;
  for (;;) {
    commentNumberSchema.parse(number);
    const reservation = join(folder, `${number}.json`);
    try {
      await writeFile(reservation, JSON.stringify({ id, number }), {
        flag: 'wx',
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      number++;
      continue;
    }
    try {
      // Publish the ID lookup only after the complete reservation is on disk.
      await link(reservation, identity);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    return recordSchema.parse(JSON.parse(await readFile(identity, 'utf8')))
      .number;
  }
}
