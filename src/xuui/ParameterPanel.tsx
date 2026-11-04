import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronsRight, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ParameterSlider } from '@/components/ui/parameter-slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Variant } from './model';
import { LayerInspector } from './LayerInspector';
import type { LayerProperties } from './layerProperties';
import type {
  ControlMap,
  ParameterValue,
  ParameterValues,
  StudioBindings,
} from './parameters';

function ColorValue({ color }: { color: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden="true"
        className="size-3 shrink-0 rounded-[3px] border border-border"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono">{color.toUpperCase()}</span>
    </span>
  );
}

function ParameterControls({
  controls = {},
  values,
  onChange,
}: {
  controls?: ControlMap;
  values: ParameterValues;
  onChange: (key: string, value: ParameterValue) => void;
}) {
  const prefix = useId();
  return (
    <>
      {Object.entries(controls).map(([key, control]) => {
        const id = `${prefix}-${key}`;
        const value = values[key] ?? control.default;
        if (control.type === 'boolean')
          return (
            <Field
              key={key}
              orientation="horizontal"
              className="parameter-field"
            >
              <FieldLabel htmlFor={id}>{control.label}</FieldLabel>
              <Switch
                size="sm"
                id={id}
                checked={value === true}
                onCheckedChange={(checked) => onChange(key, checked)}
              />
            </Field>
          );
        return (
          <Field
            key={key}
            orientation={
              control.type === 'number' ||
              (control.type === 'string' && control.multiline)
                ? 'vertical'
                : 'horizontal'
            }
            className={
              control.type === 'number' ? undefined : 'parameter-field'
            }
          >
            <FieldLabel
              htmlFor={id}
              className={control.type === 'number' ? 'sr-only' : undefined}
            >
              {control.label}
            </FieldLabel>
            {control.type === 'number' && (
              <ParameterSlider
                label={control.label}
                min={control.min}
                max={control.max}
                step={control.step}
                unit={control.unit}
                value={Number(value)}
                onChange={(next) => onChange(key, next)}
              />
            )}
            {control.type === 'string' &&
              (control.multiline ? (
                <Textarea
                  id={id}
                  value={String(value)}
                  placeholder={control.placeholder}
                  onChange={(event) => onChange(key, event.target.value)}
                />
              ) : (
                <Input
                  id={id}
                  type="text"
                  className="parameter-string-input ml-auto w-28"
                  value={String(value)}
                  placeholder={control.placeholder}
                  onChange={(event) => onChange(key, event.target.value)}
                />
              ))}
            {control.type === 'select' && (
              <Select
                value={String(value)}
                onValueChange={(next) => {
                  const option = control.options.find(
                    (item) => String(item.value) === next,
                  );
                  if (option) onChange(key, option.value);
                }}
                items={control.options.map((option) => ({
                  value: String(option.value),
                  label: option.label,
                }))}
              >
                <SelectTrigger id={id} className="ml-auto w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {control.options.map((option) => (
                      <SelectItem
                        key={String(option.value)}
                        value={String(option.value)}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            {control.type === 'color' && (
              <Select
                value={String(value)}
                items={control.swatches.map((color) => ({
                  value: color,
                  label: color.toUpperCase(),
                }))}
                onValueChange={(next) => {
                  if (next) onChange(key, next);
                }}
              >
                <SelectTrigger id={id} className="ml-auto w-auto">
                  <SelectValue>
                    {() => <ColorValue color={String(value)} />}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {control.swatches.map((color) => (
                      <SelectItem key={color} value={color}>
                        <ColorValue color={color} />
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </Field>
        );
      })}
    </>
  );
}

export function ParameterPanel({
  variant,
  studyId,
  selectedLayer,
  bindings,
  setValue,
  machineState,
  setMachineState,
  onCollapse,
  feedbackPanel,
}: {
  variant: Variant | undefined;
  studyId: string;
  selectedLayer: LayerProperties | null;
  bindings: StudioBindings;
  setValue: (
    section: 'props' | 'state',
    key: string,
    value: ParameterValue,
  ) => void;
  machineState: string | undefined;
  setMachineState: (value: string) => void;
  send: (event: string) => void;
  onCollapse: () => void;
  feedbackPanel?: ReactNode;
}) {
  const controls = variant?.controls;
  const machine = controls?.machine;
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState('');
  useEffect(() => {
    setCopied(false);
    setFallback('');
  }, [variant?.id, selectedLayer?.name]);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    const value = selectedLayer
      ? {
          studyId,
          variantId: selectedLayer.variantId,
          layer: selectedLayer.name,
          bounds: selectedLayer.bounds,
          typography: Object.fromEntries(
            selectedLayer.typography.map(({ label, value }) => [label, value]),
          ),
          appearance: Object.fromEntries(
            selectedLayer.appearance.map(({ label, value }) => [label, value]),
          ),
        }
      : {
          schemaVersion: 1,
          studyId,
          variantId: variant?.id,
          props: bindings.props,
          state: bindings.state,
          ...(machineState ? { machine: { value: machineState } } : {}),
        };
    const text = JSON.stringify(value, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFallback('');
    } catch {
      setFallback(text);
    }
  };
  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={
          copied
            ? 'Copied properties'
            : selectedLayer
              ? 'Copy layer properties'
              : 'Copy parameters'
        }
        title={selectedLayer ? 'Copy layer properties' : 'Copy parameters'}
        onClick={() => void copy()}
      >
        {copied ? (
          <Check data-icon="inline-start" />
        ) : (
          <Copy data-icon="inline-start" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Collapse sidebar"
        title="Collapse sidebar (⌘\ / Ctrl+\)"
        onClick={onCollapse}
      >
        <ChevronsRight data-icon="inline-start" />
      </Button>
    </div>
  );
  return (
    <aside
      data-workspace-control
      aria-label="Sidebar"
      className="studio-chrome sidebar-scroll-mask flex h-full min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain bg-studio-background px-4 pt-2 pb-6"
    >
      {selectedLayer ? (
        <LayerInspector layer={selectedLayer} action={actions} />
      ) : (
        <>
          <header className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-medium">Properties</h2>
            {actions}
          </header>
          {Boolean(Object.keys(controls?.state ?? {}).length || machine) && (
            <section
              aria-labelledby="state-heading"
              className="flex flex-col gap-3"
            >
              <h2 id="state-heading" className="text-xs font-semibold">
                State
              </h2>
              <FieldGroup>
                <ParameterControls
                  controls={controls?.state}
                  values={bindings.state}
                  onChange={(key, value) => setValue('state', key, value)}
                />
                {machine && machineState && (
                  <Field orientation="horizontal" className="parameter-field">
                    <FieldLabel htmlFor="machine-state">
                      {machine.label}
                    </FieldLabel>
                    <Select
                      value={machineState}
                      onValueChange={(value) => {
                        if (value) setMachineState(value);
                      }}
                      items={Object.entries(machine.states).map(
                        ([value, state]) => ({
                          value,
                          label: state.label,
                        }),
                      )}
                    >
                      <SelectTrigger
                        id="machine-state"
                        className="ml-auto w-auto"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {Object.entries(machine.states).map(
                            ([value, state]) => (
                              <SelectItem key={value} value={value}>
                                {state.label}
                              </SelectItem>
                            ),
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </FieldGroup>
            </section>
          )}
          {Object.keys(controls?.props ?? {}).length > 0 && (
            <section
              aria-labelledby="props-heading"
              className="flex flex-col gap-3"
            >
              <h2 id="props-heading" className="text-xs font-semibold">
                Props
              </h2>
              <FieldGroup>
                <ParameterControls
                  controls={controls?.props}
                  values={bindings.props}
                  onChange={(key, value) => setValue('props', key, value)}
                />
              </FieldGroup>
            </section>
          )}
          {feedbackPanel}
        </>
      )}
      {fallback && (
        <Field>
          <FieldLabel htmlFor="copy-properties">
            Select and copy properties
          </FieldLabel>
          <Textarea
            id="copy-properties"
            readOnly
            value={fallback}
            rows={7}
            onFocus={(event) => event.target.select()}
          />
        </Field>
      )}
    </aside>
  );
}
