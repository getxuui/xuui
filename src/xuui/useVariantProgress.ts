import { useEffect, useState } from 'react';
import { z } from 'zod';
import { variantProgressSchema } from './variantProgress';
import type { VariantProgress } from './variantProgress';

export function useVariantProgress() {
  const [progress, setProgress] = useState<VariantProgress[] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer = 0;
    const refresh = async () => {
      try {
        const response = await fetch('/__xuui/variant-progress', {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Could not read variant progress.');
        if (response.ok) {
          const next = z
            .array(variantProgressSchema)
            .parse(await response.json());
          if (!controller.signal.aborted)
            setProgress((previous) =>
              JSON.stringify(previous) === JSON.stringify(next)
                ? previous
                : next,
            );
        }
      } catch {
        // Keep the last signal through temporary dev-server disconnects.
        if (!controller.signal.aborted)
          setProgress((previous) => previous ?? []);
      } finally {
        if (!controller.signal.aborted)
          timer = window.setTimeout(refresh, 1000);
      }
    };
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
  return progress;
}
