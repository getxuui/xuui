import { useId } from 'react';
import type { ReactNode } from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { ParameterSlider } from '@/components/ui/parameter-slider';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { defaultGrids } from './grids';
import type { Grid } from './grids';

const gridLabels = { pixels: 'Pixel grid', columns: 'Columns', rows: 'Rows' };

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <Field orientation="horizontal" className="parameter-field">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Switch
        id={id}
        size="sm"
        className="ml-auto data-checked:bg-brand"
        checked={checked}
        onCheckedChange={onChange}
      />
    </Field>
  );
}

/* Rows in a block touch with hairline gaps under one rounded outline. The
   studio's .parameter-field radius outranks utilities, hence !important. */
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="flex flex-col overflow-hidden rounded-[10px] [&_.parameter-field]:rounded-none! [&_.parameter-slider]:rounded-none [&_.parameter-slider_*]:rounded-none"
    >
      {children}
    </section>
  );
}

/** A grid's values fold away under its switch while it is off. */
function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      inert={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        {/* The hairline sits inside, so a closed block keeps round corners. */}
        <div className="flex flex-col gap-px pt-px">{children}</div>
      </div>
    </div>
  );
}

/* Sliders cover the common range; an authored value beyond it widens the
   range instead of being clamped. */
function Measure({
  label,
  value,
  max,
  unit,
  min = 0,
  step = 0.5,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <ParameterSlider
      label={label}
      value={value}
      min={min}
      max={Math.max(max, value)}
      step={step}
      unit={unit}
      onChange={onChange}
    />
  );
}

export function ViewSettings({
  grids,
  declared,
  rulers,
  onRulersChange,
  onChange,
  onReset,
}: {
  grids: Grid[];
  /** Layout grids the agent set up for this variant. */
  declared: Grid['type'][];
  rulers: boolean;
  onRulersChange: (visible: boolean) => void;
  onChange: (grids: Grid[]) => void;
  onReset: () => void;
}) {
  const update = (grid: Grid) =>
    onChange([...grids.filter((item) => item.type !== grid.type), grid]);
  // The pixel grid measures any design. Columns and rows only mean something
  // for a layout the agent set up.
  const shown = defaultGrids.filter(
    (grid) => grid.type === 'pixels' || declared.includes(grid.type),
  );
  const missing = (['columns', 'rows'] as const).filter(
    (type) => !declared.includes(type),
  );
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View settings"
            title="View"
          />
        }
      >
        <Settings2 data-icon="inline-start" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={12}
        data-workspace-control
        className="studio-chrome max-h-[min(680px,80dvh)] w-72 gap-5 overflow-y-auto rounded-xl border border-border p-3 text-xs shadow-studio-floating ring-0"
      >
        <header className="flex items-center justify-between gap-2">
          <PopoverTitle className="text-sm">View</PopoverTitle>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Reset grids"
            title="Reset grids"
            onClick={onReset}
          >
            <RotateCcw data-icon="inline-start" />
          </Button>
        </header>
        <SwitchRow
          label="Rulers and guides"
          checked={rulers}
          onChange={onRulersChange}
        />
        {shown.map((defaults) => {
          const grid =
            grids.find((item) => item.type === defaults.type) ?? defaults;
          const enabled = grids.some(
            (item) => item.type === defaults.type && item.visible !== false,
          );
          const label = gridLabels[grid.type];
          return (
            <Block key={grid.type} label={label}>
              <SwitchRow
                label={label}
                checked={enabled}
                onChange={(visible) => update({ ...grid, visible })}
              />
              <Collapsible open={enabled}>
                {grid.type === 'pixels' ? (
                  <Measure
                    label="Size"
                    value={grid.size}
                    min={0.5}
                    max={64}
                    unit="px"
                    onChange={(size) => update({ ...grid, size })}
                  />
                ) : (
                  <>
                    <Measure
                      label="Count"
                      value={grid.count}
                      min={1}
                      max={24}
                      step={1}
                      onChange={(count) => update({ ...grid, count })}
                    />
                    <Measure
                      label="Gutter"
                      value={grid.gutter}
                      max={64}
                      unit="px"
                      onChange={(gutter) => update({ ...grid, gutter })}
                    />
                    <Measure
                      label="Margin"
                      value={grid.margin}
                      max={128}
                      unit="px"
                      onChange={(margin) => update({ ...grid, margin })}
                    />
                  </>
                )}
              </Collapsible>
            </Block>
          );
        })}
        {missing.length > 0 && (
          <p className="-mt-2 px-2.5 text-center text-[11px] leading-4 text-muted-foreground">
            Agent hasn’t set up{' '}
            {missing.length === 2 ? 'columns or rows' : missing[0]}.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
