import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Iteration, Project } from './model';
import { MaskedMarquee } from './MaskedMarquee';

export function StudyNavigation({
  studies,
  studyId,
  variants,
  variantId,
  allVariants,
  onStudyChange,
  onVariantChange,
  onAllVariantsChange,
}: {
  studies: Pick<Project, 'id' | 'name'>[];
  studyId: string;
  variants: Pick<Iteration, 'id' | 'name'>[];
  variantId: string | undefined;
  allVariants: boolean;
  onStudyChange: (id: string) => void;
  onVariantChange: (id: string, focus?: boolean) => void;
  onAllVariantsChange: (all: boolean) => void;
}) {
  const study = studies.find((item) => item.id === studyId);
  const index = variants.findIndex((item) => item.id === variantId);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Field className="min-w-0">
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
      <div className="flex min-w-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Previous variant"
          disabled={index <= 0}
          onClick={() => onVariantChange(variants[index - 1].id)}
        >
          <ChevronLeft data-icon="inline-start" className="rtl:rotate-180" />
        </Button>
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="variant-picker" className="sr-only">
            Variant
          </FieldLabel>
          <Select
            value={allVariants ? '__all__' : (variantId ?? null)}
            onValueChange={(value) => {
              if (value === '__all__') onAllVariantsChange(true);
              else if (value) onVariantChange(value, true);
            }}
            items={[
              { value: '__all__', label: 'All variants' },
              ...variants.map((item) => ({ value: item.id, label: item.name })),
            ]}
          >
            <SelectTrigger id="variant-picker" className="w-full">
              <SelectValue className="min-w-0 justify-start text-start">
                {() => (
                  <MaskedMarquee
                    text={
                      allVariants
                        ? 'All variants'
                        : (variants[index]?.name ?? 'Choose a variant')
                    }
                  />
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all__">All variants</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                {variants.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <MaskedMarquee text={item.name} />
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Next variant"
          disabled={index < 0 || index >= variants.length - 1}
          onClick={() => onVariantChange(variants[index + 1].id)}
        >
          <ChevronRight data-icon="inline-end" className="rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
