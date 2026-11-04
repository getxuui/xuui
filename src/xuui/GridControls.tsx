import { useEffect, useId, useState } from 'react';
import { Grid2X2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { defaultGrids } from './grids';
import type { Grid } from './grids';

function GridNumber({
  label,
  name = label,
  value,
  minimum,
  integer = false,
  positive = false,
  onChange,
}: {
  label: string;
  name?: string;
  value: number;
  minimum: number;
  integer?: boolean;
  positive?: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const number = Number(text);
  const valid =
    text.trim() !== '' &&
    Number.isFinite(number) &&
    (positive ? number > minimum : number >= minimum) &&
    (!integer || (Number.isInteger(number) && number <= 1000));
  return (
    <Field data-invalid={!valid || undefined} className="min-w-0 gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        aria-label={name}
        min={minimum}
        max={integer ? 1000 : undefined}
        step={integer ? 1 : 'any'}
        value={text}
        aria-invalid={!valid}
        aria-describedby={!valid ? `${id}-error` : undefined}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (valid) onChange(number);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (valid) {
              onChange(number);
              event.currentTarget.blur();
            }
          }
          if (event.key === 'Escape') {
            event.stopPropagation();
            setText(String(value));
            event.currentTarget.blur();
          }
        }}
      />
      {!valid && (
        <FieldDescription id={`${id}-error`}>
          {integer
            ? 'Use a whole number from 1 to 1000.'
            : `Use ${positive || minimum > 0 ? 'a positive number' : 'zero or a positive number'}.`}
        </FieldDescription>
      )}
    </Field>
  );
}

export function GridControls({
  name,
  grids,
  onChange,
  onReset,
}: {
  name: string;
  grids: Grid[];
  onChange: (grids: Grid[]) => void;
  onReset: () => void;
}) {
  const baseId = useId();
  const update = (grid: Grid) =>
    onChange([...grids.filter((item) => item.type !== grid.type), grid]);
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Grid settings"
            title="Grids"
          />
        }
      >
        <Grid2X2 data-icon="inline-start" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={12}
        data-workspace-control
        className="studio-chrome max-h-[min(680px,80dvh)] w-72 overflow-y-auto p-4"
      >
        <PopoverHeader>
          <PopoverTitle>Grids</PopoverTitle>
          <PopoverDescription>{name}</PopoverDescription>
        </PopoverHeader>
        <FieldGroup className="gap-4">
          {defaultGrids.map((defaults) => {
            const grid =
              grids.find((item) => item.type === defaults.type) ?? defaults;
            const enabled = grids.some(
              (item) => item.type === defaults.type && item.visible !== false,
            );
            const label =
              grid.type === 'pixels'
                ? 'Pixel grid'
                : grid.type === 'columns'
                  ? 'Columns'
                  : 'Rows';
            const prefix = grid.type === 'columns' ? 'Column' : 'Row';
            const id = `${baseId}-${grid.type}`;
            return (
              <FieldSet key={grid.type} className="gap-2">
                <FieldLegend className="sr-only">{label}</FieldLegend>
                <Field orientation="horizontal">
                  <FieldLabel htmlFor={id}>{label}</FieldLabel>
                  <Switch
                    id={id}
                    size="sm"
                    checked={enabled}
                    onCheckedChange={(visible) => update({ ...grid, visible })}
                  />
                </Field>
                {enabled &&
                  (grid.type === 'pixels' ? (
                    <GridNumber
                      label="Pixel size (px)"
                      name="Pixel size"
                      value={grid.size}
                      minimum={0}
                      positive
                      onChange={(size) => update({ ...grid, size })}
                    />
                  ) : (
                    <FieldGroup className="grid grid-cols-3 gap-2">
                      <GridNumber
                        label="Count"
                        name={`${prefix} count`}
                        value={grid.count}
                        minimum={1}
                        integer
                        onChange={(count) => update({ ...grid, count })}
                      />
                      <GridNumber
                        label="Gutter (px)"
                        name={`${prefix} gutter`}
                        value={grid.gutter}
                        minimum={0}
                        onChange={(gutter) => update({ ...grid, gutter })}
                      />
                      <GridNumber
                        label="Margin (px)"
                        name={`${prefix} margin`}
                        value={grid.margin}
                        minimum={0}
                        onChange={(margin) => update({ ...grid, margin })}
                      />
                    </FieldGroup>
                  ))}
              </FieldSet>
            );
          })}
        </FieldGroup>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset grids
        </Button>
      </PopoverContent>
    </Popover>
  );
}
