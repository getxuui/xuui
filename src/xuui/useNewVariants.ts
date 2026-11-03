import { useEffect, useState } from 'react';

const highlightMs = 2400;

function readSeen(key: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Variants that arrived since this browser last saw the study, such as ones
 * an agent just added. The first visit to a study marks everything as seen,
 * so only later arrivals are highlighted, and each only once.
 */
export function useNewVariants(
  studyId: string,
  variantIds: string[],
): ReadonlySet<string> {
  const [arrivals, setArrivals] = useState<ReadonlySet<string>>(new Set());
  const ids = variantIds.join('\n');
  useEffect(() => {
    const key = `xuui:${studyId}:seen-variants:v1`;
    const seen = readSeen(key);
    const current = ids ? ids.split('\n') : [];
    try {
      localStorage.setItem(
        key,
        JSON.stringify([...new Set([...(seen ?? []), ...current])]),
      );
    } catch {
      // Without storage, nothing is highlighted.
    }
    const fresh = seen ? current.filter((id) => !seen.includes(id)) : [];
    if (fresh.length) setArrivals(new Set(fresh));
  }, [studyId, ids]);
  useEffect(() => {
    if (!arrivals.size) return;
    const timer = window.setTimeout(() => setArrivals(new Set()), highlightMs);
    return () => clearTimeout(timer);
  }, [arrivals]);
  return arrivals;
}
