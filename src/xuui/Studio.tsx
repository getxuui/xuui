import { useEffect, useRef, useState } from 'react';
import Preview from './Preview';
import type { Study } from './model';
function readVariant(studies: Study[]) {
  const params = new URLSearchParams(window.location.search);
  const study =
    studies.find((study) => study.id === params.get('study')) ?? studies[0];
  const requested =
    params.get('variant') ??
    params.get('variation') ??
    params.get('preview') ??
    params.get('iteration');
  return requested &&
    studies.some((study) =>
      study.variants.some((variant) => variant.id === requested),
    )
    ? requested
    : (study.variants[0]?.id ?? '');
}

export function Studio({ studies }: { studies: Study[] }) {
  const [variantId, setVariantId] = useState(() => readVariant(studies));
  const study =
    studies.find((study) =>
      study.variants.some((variant) => variant.id === variantId),
    ) ?? studies[0];
  const remembered = useRef<Record<string, string>>({});
  useEffect(() => {
    remembered.current[study.id] = variantId;
  }, [study.id, variantId]);
  const [allVariants, setAllVariants] = useState(
    () => new URLSearchParams(window.location.search).get('view') === 'all',
  );
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    const canonicalId = readVariant(studies);
    setVariantId(canonicalId);
    const canonicalStudy =
      studies.find((study) =>
        study.variants.some((variant) => variant.id === canonicalId),
      ) ?? studies[0];
    const canonical = new URLSearchParams({
      study: canonicalStudy.id,
      variant: canonicalId,
    });
    if (current.get('view') === 'all') canonical.set('view', 'all');
    if (current.toString() !== canonical.toString())
      window.history.replaceState({}, '', `/?${canonical}`);
    const pop = () => {
      setVariantId(readVariant(studies));
      setAllVariants(
        new URLSearchParams(window.location.search).get('view') === 'all',
      );
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const switchVariant = (id: string, focus = false) => {
    const targetStudy = studies.find((study) =>
      study.variants.some((variant) => variant.id === id),
    );
    if (!targetStudy) return;
    const params = new URLSearchParams({ study: targetStudy.id, variant: id });
    if (allVariants && !focus) params.set('view', 'all');
    window.history.pushState({}, '', `/?${params}`);
    setVariantId(id);
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
  };
  const switchStudy = (id: string) => {
    const targetStudy = studies.find((item) => item.id === id);
    if (!targetStudy || targetStudy.id === study.id) return;
    const variantId = remembered.current[id] ?? targetStudy.variants[0]?.id;
    if (!variantId) return;
    const params = new URLSearchParams({
      study: targetStudy.id,
      variant: variantId,
    });
    if (allVariants) params.set('view', 'all');
    window.history.pushState({}, '', `/?${params}`);
    setVariantId(variantId);
  };
  return (
    <Preview
      study={study}
      variantId={variantId}
      onVariantChange={switchVariant}
      allVariants={allVariants}
      onAllVariantsChange={changeView}
      studies={studies}
      onStudyChange={switchStudy}
    />
  );
}
