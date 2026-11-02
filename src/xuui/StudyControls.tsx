import { ChevronsLeft } from 'lucide-react';
import { XuuiLogo } from '@/components/XuuiLogo';
import { Button } from '@/components/ui/button';
import type { Iteration, Project } from './model';
import { StudyNavigation } from './StudyNavigation';

export function StudyControls({
  projectId,
  variantId,
  variants,
  onVariantChange,
  allVariants,
  onAllVariantsChange,
  studies,
  onStudyChange,
  onCollapse,
}: {
  projectId: string;
  variantId: string | undefined;
  variants: Pick<Iteration, 'id' | 'name'>[];
  onVariantChange: (id: string, focus?: boolean) => void;
  allVariants: boolean;
  onAllVariantsChange: (all: boolean) => void;
  studies: Project[];
  onStudyChange: (id: string) => void;
  onCollapse: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      <header className="flex shrink-0 items-center justify-between gap-2">
        <h1 aria-label="xuui" className="flex min-h-6 items-center">
          <XuuiLogo className="size-4 shrink-0" />
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
        studyId={projectId}
        variants={variants}
        variantId={variantId}
        allVariants={allVariants}
        onStudyChange={onStudyChange}
        onVariantChange={onVariantChange}
        onAllVariantsChange={onAllVariantsChange}
      />
    </div>
  );
}
