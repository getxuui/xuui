import { ChevronsLeft } from 'lucide-react';
import { XuuiLogo } from '@/components/XuuiLogo';
import { Button } from '@/components/ui/button';
import type { Study, Variant } from './model';
import { StudyNavigation } from './StudyNavigation';

export function StudyControls({
  studyId,
  variantId,
  variants,
  onVariantChange,
  allVariants,
  onAllVariantsChange,
  studies,
  onStudyChange,
  onCollapse,
  newVariantIds,
  workingVariantIds,
}: {
  studyId: string;
  variantId: string | undefined;
  variants: Pick<Variant, 'id' | 'name'>[];
  onVariantChange: (id: string, focus?: boolean) => void;
  allVariants: boolean;
  onAllVariantsChange: (all: boolean) => void;
  studies: Study[];
  onStudyChange: (id: string) => void;
  onCollapse: () => void;
  newVariantIds: ReadonlySet<string>;
  workingVariantIds: ReadonlySet<string>;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      <header className="flex shrink-0 items-center justify-between gap-2">
        <h1 aria-label="xuui" className="flex min-h-6 items-center">
          <XuuiLogo className="size-4 shrink-0 text-brand" />
        </h1>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Collapse layers"
          onClick={onCollapse}
        >
          <ChevronsLeft data-icon="inline-start" />
        </Button>
      </header>
      <StudyNavigation
        studies={studies}
        studyId={studyId}
        variants={variants}
        variantId={variantId}
        allVariants={allVariants}
        onStudyChange={onStudyChange}
        onVariantChange={onVariantChange}
        onAllVariantsChange={onAllVariantsChange}
        newVariantIds={newVariantIds}
        workingVariantIds={workingVariantIds}
      />
    </div>
  );
}
