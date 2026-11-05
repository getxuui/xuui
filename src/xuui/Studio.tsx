import { useEffect, useRef, useState } from 'react';
import Preview from './Preview';
import type { Study } from './model';
import type { VariantProgress } from './variantProgress';
import { useVariantProgress } from './useVariantProgress';

function studyForVariant(
  studies: Study[],
  id: string,
  progress: VariantProgress[] | null,
) {
  return (
    studies.find((study) =>
      study.variants.some((variant) => variant.id === id),
    ) ??
    studies.find((study) =>
      progress?.some(
        (item) => item.studyId === study.id && item.variantId === id,
      ),
    )
  );
}

function readVariant(studies: Study[], progress: VariantProgress[] | null) {
  const params = new URLSearchParams(window.location.search);
  const study =
    studies.find((study) => study.id === params.get('study')) ?? studies[0];
  const requested =
    params.get('variant') ??
    params.get('variation') ??
    params.get('preview') ??
    params.get('iteration');
  return requested &&
    (progress === null || studyForVariant(studies, requested, progress))
    ? requested
    : (study.variants[0]?.id ?? '');
}

export function Studio({ studies }: { studies: Study[] }) {
  const progress = useVariantProgress();
  const [variantId, setVariantId] = useState(() =>
    readVariant(studies, progress),
  );
  // Null leaves selection to app interactions; arrays restore browser URLs.
  const [layerSelectors, setLayerSelectors] = useState<string[] | null>(() => {
    const selectors = new URLSearchParams(window.location.search).getAll(
      'layer',
    );
    return selectors.length ? selectors : null;
  });
  const study =
    studyForVariant(studies, variantId, progress) ??
    studies.find(
      (study) =>
        study.id === new URLSearchParams(window.location.search).get('study'),
    ) ??
    studies[0];
  const remembered = useRef<Record<string, string>>({});
  useEffect(() => {
    remembered.current[study.id] = variantId;
  }, [study.id, variantId]);
  const [allVariants, setAllVariants] = useState(
    () => new URLSearchParams(window.location.search).get('view') === 'all',
  );
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    const canonicalId = readVariant(studies, progress);
    setVariantId(canonicalId);
    const canonicalStudy =
      studyForVariant(studies, canonicalId, progress) ?? study;
    const canonical = new URLSearchParams({
      study: canonicalStudy.id,
      variant: canonicalId,
    });
    if (current.get('view') === 'all') canonical.set('view', 'all');
    for (const selector of current.getAll('layer'))
      canonical.append('layer', selector);
    // Wait for the first progress read before treating a working URL as missing.
    if (progress !== null && current.toString() !== canonical.toString())
      window.history.replaceState({}, '', `/?${canonical}`);
    const pop = () => {
      setVariantId(readVariant(studies, progress));
      setLayerSelectors(
        new URLSearchParams(window.location.search).getAll('layer'),
      );
      setAllVariants(
        new URLSearchParams(window.location.search).get('view') === 'all',
      );
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [studies, progress]);
  const switchVariant = (id: string, focus = false) => {
    const targetStudy = studyForVariant(studies, id, progress);
    if (!targetStudy) return;
    const params = new URLSearchParams({ study: targetStudy.id, variant: id });
    if (allVariants && !focus) params.set('view', 'all');
    window.history.pushState({}, '', `/?${params}`);
    setVariantId(id);
    setLayerSelectors(null);
    if (focus) setAllVariants(false);
  };
  const changeView = (all: boolean) => {
    const params = new URLSearchParams({
      study: study.id,
      variant: variantId,
    });
    if (all) params.set('view', 'all');
    window.history.pushState({}, '', `/?${params}`);
    setAllVariants(all);
    setLayerSelectors(null);
  };
  const switchStudy = (id: string) => {
    const targetStudy = studies.find((item) => item.id === id);
    if (!targetStudy || targetStudy.id === study.id) return;
    const rememberedId = remembered.current[id];
    const variantId =
      rememberedId && studyForVariant([targetStudy], rememberedId, progress)
        ? rememberedId
        : targetStudy.variants[0]?.id;
    if (!variantId) return;
    const params = new URLSearchParams({
      study: targetStudy.id,
      variant: variantId,
    });
    if (allVariants) params.set('view', 'all');
    window.history.pushState({}, '', `/?${params}`);
    setVariantId(variantId);
    setLayerSelectors(null);
  };
  return (
    <Preview
      study={study}
      progress={progress ?? []}
      variantId={variantId}
      layerSelectors={layerSelectors}
      onVariantChange={switchVariant}
      allVariants={allVariants}
      onAllVariantsChange={changeView}
      studies={studies}
      onStudyChange={switchStudy}
    />
  );
}
