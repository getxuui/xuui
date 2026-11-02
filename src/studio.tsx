import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Project } from './xuui/model';
import { Studio } from './xuui/Studio';
import './index.css';

/** Mount the installed studio around consumer-owned React study registrations. */
export function mountStudio(element: HTMLElement, studies: Project[]) {
  if (!Array.isArray(studies) || !studies.length)
    throw new Error('Export a non-empty studies array from xuui.studies.ts.');
  const ids = new Set<string>();
  for (const study of studies) {
    if (!study.iterations?.length)
      throw new Error(
        `Study ${study.name ?? study.id} needs at least one variant.`,
      );
    for (const variant of study.iterations) {
      if (ids.has(variant.id))
        throw new Error(`Duplicate variant ID: ${variant.id}`);
      ids.add(variant.id);
    }
  }
  const root = createRoot(element);
  root.render(
    <StrictMode>
      <Studio studies={studies} />
    </StrictMode>,
  );
  return root;
}
