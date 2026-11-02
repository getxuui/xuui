import { useEffect, useRef, useState } from 'react';
import Preview from './Preview';
import type { Project } from './model';
function readVariation(studies: Project[]) {
  const params = new URLSearchParams(window.location.search);
  const project =
    studies.find((study) => study.id === params.get('study')) ?? studies[0];
  const requested =
    params.get('variant') ??
    params.get('variation') ??
    params.get('preview') ??
    params.get('iteration');
  return requested &&
    studies.some((study) =>
      study.iterations.some((variant) => variant.id === requested),
    )
    ? requested
    : (project.iterations[0]?.id ?? '');
}

export function Studio({ studies }: { studies: Project[] }) {
  const [variationId, setVariationId] = useState(() => readVariation(studies));
  const project =
    studies.find((study) =>
      study.iterations.some((variant) => variant.id === variationId),
    ) ?? studies[0];
  const remembered = useRef<Record<string, string>>({});
  useEffect(() => {
    remembered.current[project.id] = variationId;
  }, [project.id, variationId]);
  const [allVariants, setAllVariants] = useState(
    () => new URLSearchParams(window.location.search).get('view') === 'all',
  );
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    const canonicalId = readVariation(studies);
    setVariationId(canonicalId);
    const canonicalStudy =
      studies.find((study) =>
        study.iterations.some((variant) => variant.id === canonicalId),
      ) ?? studies[0];
    const canonical = new URLSearchParams({
      study: canonicalStudy.id,
      variant: canonicalId,
    });
    if (current.get('view') === 'all') canonical.set('view', 'all');
    if (current.toString() !== canonical.toString())
      window.history.replaceState({}, '', `/?${canonical}`);
    const pop = () => {
      setVariationId(readVariation(studies));
      setAllVariants(
        new URLSearchParams(window.location.search).get('view') === 'all',
      );
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const switchVariation = (id: string, focus = false) => {
    const targetStudy = studies.find((study) =>
      study.iterations.some((iteration) => iteration.id === id),
    );
    if (!targetStudy) return;
    const params = new URLSearchParams({ study: targetStudy.id, variant: id });
    if (allVariants && !focus) params.set('view', 'all');
    window.history.pushState({}, '', `/?${params}`);
    setVariationId(id);
    if (focus) setAllVariants(false);
  };
  const changeView = (all: boolean) => {
    const params = new URLSearchParams({
      study: project.id,
      variant: variationId,
    });
    if (all) params.set('view', 'all');
    window.history.pushState({}, '', `/?${params}`);
    setAllVariants(all);
  };
  const switchStudy = (id: string) => {
    const study = studies.find((item) => item.id === id);
    if (!study || study.id === project.id) return;
    const variantId = remembered.current[id] ?? study.iterations[0]?.id;
    if (!variantId) return;
    const params = new URLSearchParams({ study: study.id, variant: variantId });
    if (allVariants) params.set('view', 'all');
    window.history.pushState({}, '', `/?${params}`);
    setVariationId(variantId);
  };
  return (
    <Preview
      project={project}
      iterationId={variationId}
      onVariationChange={switchVariation}
      allVariants={allVariants}
      onAllVariantsChange={changeView}
      studies={studies}
      onStudyChange={switchStudy}
    />
  );
}
