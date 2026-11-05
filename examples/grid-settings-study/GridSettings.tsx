import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import type { StudioBindings } from '../../src/xuui/parameters';
import {
  Grid2X2,
  MessageSquare,
  MousePointer2,
  Play,
  RotateCcw,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ParameterSlider } from '@/components/ui/parameter-slider';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from 'cn';

/* The canvas toolbar and its grid popover, built from the studio's own
   controls. The popover is drawn in place, not portalled, so it stays on the
   canvas for review. */

type Grids = {
  pixels: { on: boolean; size: number };
  columns: { on: boolean; count: number; gutter: number; margin: number };
  rows: { on: boolean; count: number; gutter: number; margin: number };
};

const authored: Grids = {
  pixels: { on: true, size: 8 },
  columns: { on: true, count: 12, gutter: 16, margin: 24 },
  rows: { on: true, count: 6, gutter: 16, margin: 24 },
};

function useGrids() {
  const [grids, setGrids] = useState(authored);
  const update = <K extends keyof Grids>(key: K, value: Partial<Grids[K]>) =>
    setGrids((current) => ({
      ...current,
      [key]: { ...current[key], ...value },
    }));
  return { grids, update, reset: () => setGrids(authored) };
}

const labels = { pixels: 'Pixel grid', columns: 'Columns', rows: 'Rows' };

function Stage({
  icon,
  label,
  height = 640,
  backdrop,
  centredSeparator = false,
  children,
}: {
  icon: ReactNode;
  label: string;
  height?: number;
  /** Canvas content behind the popover, such as a framed design. */
  backdrop?: ReactNode;
  /** Centre the toolbar separator, as the studio's fixed toolbar does. */
  centredSeparator?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="studio-chrome relative flex w-[440px] flex-col items-center justify-end gap-3 rounded-xl border border-canvas-border bg-canvas pb-3 font-sans text-foreground"
      style={{ height }}
      data-xuui-layer-name="Canvas"
    >
      {backdrop}
      {children}
      <div
        className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-studio-floating"
        data-xuui-layer-name="Toolbar"
      >
        {[MousePointer2, Play, MessageSquare].map((Icon, index) => (
          <span
            key={index}
            className={
              'flex size-7 items-center justify-center rounded-lg ' +
              (index === 0 ? 'bg-muted' : '')
            }
          >
            <Icon className="size-4" />
          </span>
        ))}
        <Separator
          orientation="vertical"
          className={cn('h-5', centredSeparator && 'data-vertical:self-center')}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-expanded
          title={label}
        >
          {icon}
        </Button>
      </div>
    </div>
  );
}

/** Today's popover, as shipped: default field stacks at form size. */
export function CurrentPopover() {
  const { grids, update, reset } = useGrids();
  const id = useId();
  const number = (
    label: string,
    value: number,
    onChange: (n: number) => void,
  ) => (
    <Field className="min-w-0 gap-1">
      <FieldLabel htmlFor={`${id}-${label}`}>{label}</FieldLabel>
      <Input
        id={`${id}-${label}`}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
  return (
    <Stage icon={<Grid2X2 data-icon="inline-start" />} label="Grid settings">
      <div
        className="flex w-72 flex-col gap-2.5 rounded-lg bg-popover p-4 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
        data-xuui-layer-name="Grid popover"
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="font-medium">Grids</h2>
          <p className="text-muted-foreground">Paper</p>
        </div>
        <FieldGroup className="gap-4">
          {(Object.keys(labels) as (keyof Grids)[]).map((key) => {
            const grid = grids[key];
            return (
              <FieldSet key={key} className="gap-2">
                <FieldLegend className="sr-only">{labels[key]}</FieldLegend>
                <Field orientation="horizontal">
                  <FieldLabel htmlFor={`${id}-${key}`}>
                    {labels[key]}
                  </FieldLabel>
                  <Switch
                    id={`${id}-${key}`}
                    size="sm"
                    checked={grid.on}
                    onCheckedChange={(on) => update(key, { on })}
                  />
                </Field>
                {grid.on &&
                  ('size' in grid ? (
                    number('Pixel size (px)', grid.size, (size) =>
                      update('pixels', { size }),
                    )
                  ) : (
                    <FieldGroup className="grid grid-cols-3 gap-2">
                      {number('Count', grid.count, (count) =>
                        update(key, { count }),
                      )}
                      {number('Gutter (px)', grid.gutter, (gutter) =>
                        update(key, { gutter }),
                      )}
                      {number('Margin (px)', grid.margin, (margin) =>
                        update(key, { margin }),
                      )}
                    </FieldGroup>
                  ))}
              </FieldSet>
            );
          })}
        </FieldGroup>
        <Button variant="ghost" size="sm" onClick={reset}>
          Reset grids
        </Button>
      </div>
    </Stage>
  );
}

/** The sidebar's surface: rounded, bordered and floating like the toolbar. */
function Panel({
  title,
  onReset,
  children,
}: {
  title: string;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="flex w-72 flex-col gap-5 rounded-xl border border-border bg-popover p-3 text-xs text-popover-foreground shadow-studio-floating"
      data-xuui-layer-name="Grid popover"
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
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
      {children}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
  hint,
  brand = false,
  className = 'parameter-field',
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  /** Checked switches use the brand green instead of near-black. */
  brand?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <Field orientation="horizontal" className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint && (
        <kbd className="ml-auto font-mono text-[11px] text-muted-foreground">
          {hint}
        </kbd>
      )}
      <Switch
        id={id}
        size="sm"
        className={cn(!hint && 'ml-auto', brand && 'data-checked:bg-brand')}
        checked={checked}
        onCheckedChange={onChange}
      />
    </Field>
  );
}

/** A number typed in place, like the sidebar's string fields. */
function NumberRow({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <Field orientation="horizontal" className="parameter-field">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <span className="ml-auto flex items-center gap-0.5">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          className="parameter-string-input w-12 font-mono"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => {
            const number = Number(text);
            if (text.trim() && Number.isFinite(number)) onChange(number);
            else setText(String(value));
          }}
        />
        {unit && (
          <span className="font-mono text-muted-foreground">{unit}</span>
        )}
      </span>
    </Field>
  );
}

type NumberControl = {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

type Nesting = 'flat' | 'indent' | 'card' | 'joined' | 'joined-square';

/* How a grid's values read as children of its toggle. */
const nestingStyles: Record<
  Nesting,
  { section: string; parent: string; children: string }
> = {
  flat: {
    section: 'flex flex-col gap-1.5',
    parent: 'parameter-field',
    children: 'contents',
  },
  // A guide line ties the values to the toggle above them, like a tree.
  indent: {
    section: 'flex flex-col gap-1.5',
    parent: 'parameter-field',
    children: 'ml-2.5 flex flex-col gap-1.5 border-l border-border pl-2',
  },
  // An outline holds the toggle and its values as one group.
  card: {
    section: 'flex flex-col gap-1 rounded-xl border border-border p-1',
    parent: 'parameter-field bg-transparent',
    children: 'flex flex-col gap-1',
  },
  // The rows touch, so the toggle reads as the top of one block.
  joined: {
    section:
      'flex flex-col gap-px overflow-hidden rounded-[10px] [&_.parameter-field]:rounded-none [&_.parameter-slider]:rounded-none [&_.parameter-slider_*]:rounded-none',
    parent: 'parameter-field',
    children: 'flex flex-col gap-px',
  },
  // As joined, but the toggle row's corners are squared too. The studio's
  // .parameter-field radius outranks utilities, so it needs !important.
  'joined-square': {
    section:
      'flex flex-col gap-px overflow-hidden rounded-[10px] [&_.parameter-field]:rounded-none! [&_.parameter-slider]:rounded-none [&_.parameter-slider_*]:rounded-none',
    parent: 'parameter-field',
    children: 'flex flex-col gap-px',
  },
};

function GridSections({
  grids,
  update,
  Value,
  nesting = 'flat',
  brand = false,
}: {
  grids: Grids;
  update: ReturnType<typeof useGrids>['update'];
  Value: (props: NumberControl) => ReactNode;
  nesting?: Nesting;
  brand?: boolean;
}) {
  const style = nestingStyles[nesting];
  const fields = (key: 'columns' | 'rows') => {
    const grid = grids[key];
    return (
      <>
        <Value
          label="Count"
          value={grid.count}
          min={1}
          max={24}
          onChange={(count) => update(key, { count })}
        />
        <Value
          label="Gutter"
          value={grid.gutter}
          unit="px"
          min={0}
          max={64}
          onChange={(gutter) => update(key, { gutter })}
        />
        <Value
          label="Margin"
          value={grid.margin}
          unit="px"
          min={0}
          max={128}
          onChange={(margin) => update(key, { margin })}
        />
      </>
    );
  };
  return (
    <>
      {(Object.keys(labels) as (keyof Grids)[]).map((key) => (
        <section
          key={key}
          className={style.section}
          data-xuui-layer-name={labels[key]}
        >
          <SwitchRow
            label={labels[key]}
            checked={grids[key].on}
            onChange={(on) => update(key, { on })}
            brand={brand}
            className={style.parent}
          />
          {grids[key].on && (
            <div className={style.children}>
              {key === 'pixels' ? (
                <Value
                  label="Size"
                  value={grids.pixels.size}
                  unit="px"
                  min={1}
                  max={64}
                  onChange={(size) => update('pixels', { size })}
                />
              ) : (
                fields(key)
              )}
            </div>
          )}
        </section>
      ))}
    </>
  );
}

const typed = (props: NumberControl) => <NumberRow {...props} />;
const scrubbed = ({
  label,
  value,
  unit,
  min,
  max,
  onChange,
}: NumberControl) => (
  <ParameterSlider
    label={label}
    value={value}
    unit={unit}
    min={min}
    max={max}
    onChange={onChange}
  />
);

export function SettingsRows() {
  const { grids, update, reset } = useGrids();
  return (
    <Stage icon={<Settings2 data-icon="inline-start" />} label="Grid settings">
      <Panel title="Grids" onReset={reset}>
        <GridSections grids={grids} update={update} Value={typed} />
      </Panel>
    </Stage>
  );
}

export function SettingsSliders() {
  const { grids, update, reset } = useGrids();
  return (
    <Stage icon={<Settings2 data-icon="inline-start" />} label="Grid settings">
      <Panel title="Grids" onReset={reset}>
        <GridSections grids={grids} update={update} Value={scrubbed} />
      </Panel>
    </Stage>
  );
}

export function ViewSettings() {
  const { grids, update, reset } = useGrids();
  const [rulers, setRulers] = useState(true);
  return (
    <Stage icon={<Settings2 data-icon="inline-start" />} label="View settings">
      <Panel title="View" onReset={reset}>
        <section className="flex flex-col gap-1.5">
          <h3 className="font-semibold">Canvas</h3>
          <SwitchRow
            label="Rulers and guides"
            hint="R"
            checked={rulers}
            onChange={setRulers}
          />
        </section>
        <section className="flex flex-col gap-3">
          <h3 className="font-semibold">Grids</h3>
          <GridSections grids={grids} update={update} Value={scrubbed} />
        </section>
      </Panel>
    </Stage>
  );
}

/** View settings with green switches and one toggle for every grid. */
function GroupedView({ nesting }: { nesting: Nesting }) {
  const { grids, update, reset } = useGrids();
  const [rulers, setRulers] = useState(true);
  const [showGrids, setShowGrids] = useState(true);
  return (
    <Stage
      icon={<Settings2 data-icon="inline-start" />}
      label="View settings"
      height={760}
    >
      <Panel title="View" onReset={reset}>
        <section className="flex flex-col gap-1.5">
          <h3 className="font-semibold">Canvas</h3>
          <SwitchRow
            label="Rulers and guides"
            hint="R"
            checked={rulers}
            onChange={setRulers}
            brand
          />
        </section>
        <section className="flex flex-col gap-3">
          <SwitchRow
            label="Grids"
            checked={showGrids}
            onChange={setShowGrids}
            brand
            className="h-7 pr-2.5 [&_[data-slot=field-label]]:font-semibold [&_[data-slot=field-label]]:text-foreground"
          />
          {showGrids && (
            <GridSections
              grids={grids}
              update={update}
              Value={scrubbed}
              nesting={nesting}
              brand
            />
          )}
        </section>
      </Panel>
    </Stage>
  );
}

export function GroupedIndent() {
  return <GroupedView nesting="indent" />;
}

export function GroupedCard() {
  return <GroupedView nesting="card" />;
}

export function GroupedJoined() {
  return <GroupedView nesting="joined" />;
}

/** Joined rows with no section headings, group toggle or shortcut hints. */
export function JoinedPlain() {
  const { grids, update, reset } = useGrids();
  const [rulers, setRulers] = useState(true);
  return (
    <Stage
      icon={<Settings2 data-icon="inline-start" />}
      label="View settings"
      height={760}
    >
      <Panel title="View" onReset={reset}>
        <SwitchRow
          label="Rulers and guides"
          checked={rulers}
          onChange={setRulers}
          brand
        />
        <GridSections
          grids={grids}
          update={update}
          Value={scrubbed}
          nesting="joined-square"
          brand
        />
      </Panel>
    </Stage>
  );
}

/* The sidebar's State toggles and the switches in the popover drive the same
   values: a sidebar change wins, and the popover can change it again. */
function useSyncedGrids({ state }: StudioBindings) {
  const { grids, update, reset } = useGrids();
  const pixels = state.pixels !== false;
  const columns = state.columns !== false;
  const rows = state.rows !== false;
  useEffect(() => update('pixels', { on: pixels }), [pixels]);
  useEffect(() => update('columns', { on: columns }), [columns]);
  useEffect(() => update('rows', { on: rows }), [rows]);
  return {
    grids,
    update,
    reset: () => {
      reset();
      update('pixels', { on: pixels });
      update('columns', { on: columns });
      update('rows', { on: rows });
    },
  };
}

/** A grid's values fold away under its toggle when it is off. */
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
        {/* The hairline lives inside, so a closed block keeps round corners. */}
        <div className="flex flex-col gap-px pt-px">{children}</div>
      </div>
    </div>
  );
}

export function JoinedAnimated(bindings: StudioBindings) {
  return (
    <JoinedView bindings={bindings} shown={['pixels', 'columns', 'rows']} />
  );
}

/* The pixel grid measures any design. Columns and rows only mean something
   when the agent declared them for the variant's layout. */
const declaredGrids: Record<string, (keyof Grids)[]> = {
  none: ['pixels'],
  columns: ['pixels', 'columns'],
  both: ['pixels', 'columns', 'rows'],
};

export function JoinedDeclared(bindings: StudioBindings) {
  return (
    <JoinedView
      bindings={bindings}
      shown={declaredGrids[String(bindings.props.declared)] ?? ['pixels']}
    />
  );
}

function JoinedView({
  bindings,
  shown,
  bufferZones = false,
  missingNote = false,
  centredSeparator = false,
}: {
  bindings: StudioBindings;
  shown: (keyof Grids)[];
  /** Offer a switch for the hatched buffer zone around each frame. */
  bufferZones?: boolean;
  /** Say which layout grids the agent left out, instead of hiding them silently. */
  missingNote?: boolean | 'centered';
  centredSeparator?: boolean;
}) {
  const { grids, update, reset } = useSyncedGrids(bindings);
  const [rulers, setRulers] = useState(true);
  const zonesFromSidebar = bindings.state.bufferZones !== false;
  const [zones, setZones] = useState(zonesFromSidebar);
  useEffect(() => setZones(zonesFromSidebar), [zonesFromSidebar]);
  const block =
    'flex flex-col overflow-hidden rounded-[10px] [&_.parameter-field]:rounded-none! [&_.parameter-slider]:rounded-none [&_.parameter-slider_*]:rounded-none';
  const lines = (key: 'columns' | 'rows') => (
    <>
      {scrubbed({
        label: 'Count',
        value: grids[key].count,
        min: 1,
        max: 24,
        onChange: (count) => update(key, { count }),
      })}
      {scrubbed({
        label: 'Gutter',
        value: grids[key].gutter,
        unit: 'px',
        min: 0,
        max: 64,
        onChange: (gutter) => update(key, { gutter }),
      })}
      {scrubbed({
        label: 'Margin',
        value: grids[key].margin,
        unit: 'px',
        min: 0,
        max: 128,
        onChange: (margin) => update(key, { margin }),
      })}
    </>
  );
  return (
    <Stage
      icon={<Settings2 data-icon="inline-start" />}
      label="View settings"
      height={bufferZones ? 860 : 760}
      backdrop={bufferZones && <FramedDesign zones={zones} />}
      centredSeparator={centredSeparator}
    >
      <Panel title="View" onReset={reset}>
        {bufferZones ? (
          <section
            className={block + ' gap-px'}
            data-xuui-layer-name="Canvas view"
          >
            <SwitchRow
              label="Rulers and guides"
              checked={rulers}
              onChange={setRulers}
              brand
            />
            <SwitchRow
              label="Buffer zones"
              checked={zones}
              onChange={setZones}
              brand
            />
          </section>
        ) : (
          <SwitchRow
            label="Rulers and guides"
            checked={rulers}
            onChange={setRulers}
            brand
          />
        )}
        {shown.map((key) => (
          <section
            key={key}
            className={block}
            data-xuui-layer-name={labels[key]}
          >
            <SwitchRow
              label={labels[key]}
              checked={grids[key].on}
              onChange={(on) => update(key, { on })}
              brand
            />
            <Collapsible open={grids[key].on}>
              {key === 'pixels'
                ? scrubbed({
                    label: 'Size',
                    value: grids.pixels.size,
                    unit: 'px',
                    min: 1,
                    max: 64,
                    onChange: (size) => update('pixels', { size }),
                  })
                : lines(key)}
            </Collapsible>
          </section>
        ))}
        {missingNote && (
          <MissingGrids shown={shown} centered={missingNote === 'centered'} />
        )}
      </Panel>
    </Stage>
  );
}

function MissingGrids({
  shown,
  centered = false,
}: {
  shown: (keyof Grids)[];
  /** Centred and shorter, as a quiet footnote to the popover. */
  centered?: boolean;
}) {
  const missing = (['columns', 'rows'] as const).filter(
    (key) => !shown.includes(key),
  );
  if (!missing.length) return null;
  return (
    <p
      className={cn(
        '-mt-2 px-2.5 text-[11px] leading-4 text-muted-foreground',
        centered && 'text-center',
      )}
      data-xuui-layer-name="Missing grids note"
    >
      {centered ? 'Agent' : 'The agent'} hasn’t set up{' '}
      {missing.length === 2 ? 'columns or rows' : missing[0]}.
    </p>
  );
}

/* A small frame drawn like the studio's: the hatched buffer zone and its
   dashed outline surround the design, and switch off together. */
function FramedDesign({ zones }: { zones: boolean }) {
  return (
    <div
      className="absolute top-6 left-1/2 -translate-x-1/2 p-6"
      data-xuui-layer-name="Framed design"
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[12px] border border-dashed border-foreground/15 transition-opacity duration-200 motion-reduce:transition-none',
          zones ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, color-mix(in oklab, var(--foreground) 5%, transparent) 0 1px, transparent 1px 17px)',
        }}
      />
      <div className="relative flex h-16 w-40 items-center justify-center rounded-md bg-card text-[11px] text-muted-foreground shadow-sm">
        Design
      </div>
    </div>
  );
}

export function JoinedBufferZones(bindings: StudioBindings) {
  return (
    <JoinedView
      bindings={bindings}
      shown={declaredGrids[String(bindings.props.declared)] ?? ['pixels']}
      bufferZones
    />
  );
}

export function JoinedMissingNote(bindings: StudioBindings) {
  return (
    <JoinedView
      bindings={bindings}
      shown={declaredGrids[String(bindings.props.declared)] ?? ['pixels']}
      bufferZones
      missingNote
    />
  );
}

/* What the agent set up comes from the sidebar's State, so the grids shown
   and the note follow it live. Whether each grid is on stays in the popover. */
export function JoinedDeclaredState(bindings: StudioBindings) {
  const shown: (keyof Grids)[] = [
    'pixels',
    ...(bindings.state.declaredColumns === true ? (['columns'] as const) : []),
    ...(bindings.state.declaredRows === true ? (['rows'] as const) : []),
  ];
  return (
    <JoinedView bindings={bindings} shown={shown} bufferZones missingNote />
  );
}

export function JoinedCenteredNote(bindings: StudioBindings) {
  const shown: (keyof Grids)[] = [
    'pixels',
    ...(bindings.state.declaredColumns === true ? (['columns'] as const) : []),
    ...(bindings.state.declaredRows === true ? (['rows'] as const) : []),
  ];
  return (
    <JoinedView
      bindings={bindings}
      shown={shown}
      bufferZones
      missingNote="centered"
    />
  );
}

export function JoinedAlignedToolbar(bindings: StudioBindings) {
  const shown: (keyof Grids)[] = [
    'pixels',
    ...(bindings.state.declaredColumns === true ? (['columns'] as const) : []),
    ...(bindings.state.declaredRows === true ? (['rows'] as const) : []),
  ];
  return (
    <JoinedView
      bindings={bindings}
      shown={shown}
      bufferZones
      missingNote="centered"
      centredSeparator
    />
  );
}
