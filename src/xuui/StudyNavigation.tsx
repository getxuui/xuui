import { useLayoutEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { Diamond, GalleryHorizontalEnd } from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Study, Variant } from './model';
import { MaskedMarquee } from './MaskedMarquee';
import { VariantSpinner } from './VariantSpinner';

export function StudyNavigation({
  studies,
  studyId,
  variants,
  variantId,
  allVariants,
  onStudyChange,
  onVariantChange,
  onAllVariantsChange,
  newVariantIds,
  workingVariantIds,
}: {
  studies: Pick<Study, 'id' | 'name'>[];
  studyId: string;
  variants: Pick<Variant, 'id' | 'name'>[];
  variantId: string | undefined;
  allVariants: boolean;
  onStudyChange: (id: string) => void;
  onVariantChange: (id: string, focus?: boolean) => void;
  onAllVariantsChange: (all: boolean) => void;
  newVariantIds: ReadonlySet<string>;
  workingVariantIds: ReadonlySet<string>;
}) {
  const navigation = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const list = navigation.current;
    if (!list || !variantId) return;
    const link = list.querySelector<HTMLElement>(
      `[data-variant-link="${CSS.escape(variantId)}"]`,
    );
    if (!link) return;
    const area = list.getBoundingClientRect();
    const row = link.getBoundingClientRect();
    // Leave room above the bottom fade when possible. Scroll only the list,
    // so revealing a variant cannot move the canvas or take keyboard focus.
    const inset = Math.min(
      parseFloat(getComputedStyle(list).paddingBottom),
      Math.max(0, area.height - row.height),
    );
    const delta =
      row.top < area.top
        ? Math.floor(row.top - area.top)
        : Math.max(0, Math.ceil(row.bottom - area.bottom + inset));
    if (delta) list.scrollBy({ top: delta, behavior: 'instant' });
  }, [studyId, variantId, allVariants]);
  const study = studies.find((item) => item.id === studyId);
  const navigate = (
    event: MouseEvent<HTMLAnchorElement>,
    action: () => void,
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    action();
  };
  const variantUrl = (id: string, all = false) => {
    const params = new URLSearchParams({ study: studyId, variant: id });
    if (all) params.set('view', 'all');
    return `/?${params}`;
  };
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <Field className="min-w-0 shrink-0">
        <FieldLabel htmlFor="study-picker" className="sr-only">
          Study
        </FieldLabel>
        <Select
          value={studyId}
          onValueChange={(value) => {
            if (value) onStudyChange(value);
          }}
          items={studies.map((item) => ({ value: item.id, label: item.name }))}
        >
          <SelectTrigger id="study-picker" className="w-full bg-muted">
            <SelectValue className="min-w-0 justify-start text-start">
              {() => <MaskedMarquee text={study?.name ?? 'Choose a study'} />}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {studies.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  <MaskedMarquee text={item.name} />
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <nav
        ref={navigation}
        aria-label="Variants"
        data-variant-navigation
        className="sidebar-scroll-mask min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5"
        onKeyDown={(event) => {
          if (
            !['Tab', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(
              event.key,
            ) ||
            event.altKey ||
            event.metaKey ||
            event.ctrlKey
          )
            return;
          const links = [...event.currentTarget.querySelectorAll('a')];
          const target =
            event.target instanceof Element ? event.target.closest('a') : null;
          const index = target ? links.indexOf(target) : -1;
          if (index < 0) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.currentTarget.parentElement
              ?.querySelector<HTMLElement>('#study-picker')
              ?.focus();
            return;
          }
          const next =
            event.key === 'Tab'
              ? (index + (event.shiftKey ? -1 : 1) + links.length) %
                links.length
              : event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? links.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        links.length - 1,
                        index + (event.key === 'ArrowDown' ? 1 : -1),
                      ),
                    );
          links[next].focus();
          links[next].click();
        }}
      >
        <ul className="flex min-w-0 flex-col gap-0.5">
          <li>
            <a
              href={variantUrl(variantId ?? variants[0]?.id ?? '', true)}
              aria-label="All variants"
              aria-current={allVariants ? 'page' : undefined}
              className="variant-list-link flex min-h-7 min-w-0 items-center gap-2 rounded-md px-2 text-xs"
              onClick={(event) =>
                navigate(event, () => onAllVariantsChange(true))
              }
            >
              <GalleryHorizontalEnd
                aria-hidden="true"
                size={14}
                strokeWidth={1.6}
                className="shrink-0 text-muted-foreground"
              />
              <span className="min-w-0 flex-1">All</span>
              <span
                role="status"
                aria-label="Variant progress"
                className="text-[10px] text-muted-foreground"
              >
                {workingVariantIds.size > 0 && (
                  <>
                    <span className="sr-only">
                      {workingVariantIds.size} working
                    </span>
                    <VariantSpinner />
                  </>
                )}
              </span>
            </a>
          </li>
          {variants.map((variant) => {
            const working = workingVariantIds.has(variant.id);
            return (
              <li key={variant.id} className="min-w-0">
                <a
                  href={variantUrl(variant.id)}
                  aria-label={
                    working ? `${variant.name} (in progress)` : undefined
                  }
                  data-variant-link={variant.id}
                  aria-current={
                    !allVariants && variant.id === variantId
                      ? 'page'
                      : undefined
                  }
                  data-marquee-host
                  data-new-variant={newVariantIds.has(variant.id) || undefined}
                  className="variant-list-link flex min-h-7 min-w-0 items-center gap-2 rounded-md px-2 text-xs"
                  onClick={(event) =>
                    navigate(event, () => onVariantChange(variant.id, true))
                  }
                >
                  <Diamond
                    aria-hidden="true"
                    size={14}
                    strokeWidth={1.6}
                    className="shrink-0 text-muted-foreground"
                  />
                  <MaskedMarquee text={variant.name} />
                  {working && <VariantSpinner />}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
