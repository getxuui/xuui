import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import {
  reportVariantProgressSchema,
  variantProgressSchema,
} from './variantProgress.ts';
import type { VariantProgress } from './variantProgress.ts';

export async function readVariantProgress(
  directory: string,
): Promise<VariantProgress[]> {
  const folder = join(directory, 'progress');
  let files: string[];
  try {
    files = await readdir(folder);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const records = await Promise.all(
    files
      .filter((file) => /^[a-f0-9]{64}\.json$/.test(file))
      .map(async (file) => {
        try {
          return variantProgressSchema.parse(
            JSON.parse(await readFile(join(folder, file), 'utf8')),
          );
        } catch (error) {
          // A finish can remove a record between listing and reading it.
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
          throw error;
        }
      }),
  );
  return records.filter((record) => record !== null);
}

export async function reportVariantProgress(directory: string, input: unknown) {
  const { status, ...record } = reportVariantProgressSchema.parse(input);
  const folder = join(directory, 'progress');
  const key = createHash('sha256')
    .update(JSON.stringify([record.studyId, record.variantId]))
    .digest('hex');
  const file = join(folder, `${key}.json`);
  if (status === 'done') {
    await unlink(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  } else {
    const progress = variantProgressSchema.parse(record);
    await mkdir(folder, { recursive: true });
    const temporary = join(folder, `.${key}-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, `${JSON.stringify(progress, null, 2)}\n`, {
        flag: 'wx',
      });
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
  return { studyId: record.studyId, variantId: record.variantId, status };
}
