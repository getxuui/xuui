import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { z } from 'zod';

export function readSession<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  try {
    const parsed = schema.safeParse(
      JSON.parse(sessionStorage.getItem(key) ?? 'null'),
    );
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Optional session recovery. */
  }
}

/** Write on change, so even an immediate full reload can recover the latest edit. */
export function useSessionState<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(() => readSession(key, schema, fallback));
  const update: Dispatch<SetStateAction<T>> = (next) => {
    setValue((previous) => {
      const result = next instanceof Function ? next(previous) : next;
      writeSession(key, result);
      return result;
    });
  };
  return [value, update];
}
