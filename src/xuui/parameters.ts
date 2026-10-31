export type ParameterValue = string | number | boolean;
export type ParameterValues = Record<string, ParameterValue>;
export type Control =
  | { type: 'boolean'; label: string; default: boolean }
  | {
      type: 'string';
      label: string;
      default: string;
      placeholder?: string;
      multiline?: boolean;
    }
  | {
      type: 'number';
      label: string;
      default: number;
      min: number;
      max: number;
      step?: number;
      unit?: string;
    }
  | {
      type: 'select';
      label: string;
      default: string | number;
      options: { label: string; value: string | number }[];
    }
  | { type: 'color'; label: string; default: string; swatches: string[] };
export type ControlMap = Record<string, Control>;
export type StateMachine = {
  label: string;
  initial: string;
  states: Record<string, { label: string; on?: Record<string, string> }>;
};
export type Controls = {
  props?: ControlMap;
  state?: ControlMap;
  machine?: StateMachine;
};
export type StudioBindings = {
  props: ParameterValues;
  state: ParameterValues;
  machine?: { value: string; send: (event: string) => void };
};

export function valuesFor(
  controls: ControlMap = {},
  overrides: ParameterValues = {},
): ParameterValues {
  return Object.fromEntries(
    Object.entries(controls).map(([key, control]) => [
      key,
      overrides[key] ?? control.default,
    ]),
  );
}

export function validateControls(controls: Controls | undefined) {
  for (const control of Object.values({
    ...controls?.props,
    ...controls?.state,
  })) {
    if (!control.label.trim())
      throw new Error('Every studio control needs a label.');
    if (
      control.type === 'number' &&
      (!Number.isFinite(control.default) ||
        !Number.isFinite(control.min) ||
        !Number.isFinite(control.max) ||
        control.min > control.max ||
        control.default < control.min ||
        control.default > control.max ||
        (control.step !== undefined &&
          (!Number.isFinite(control.step) || control.step <= 0)))
    )
      throw new Error(`Invalid numeric control: ${control.label}`);
    if (
      control.type === 'select' &&
      (!control.options.length ||
        !control.options.some((option) => option.value === control.default))
    )
      throw new Error(`Invalid options for ${control.label}`);
    if (
      control.type === 'color' &&
      (!control.swatches.length || !control.swatches.includes(control.default))
    )
      throw new Error(`Invalid swatches for ${control.label}`);
  }
  const machine = controls?.machine;
  if (!machine) return;
  if (!machine.states[machine.initial])
    throw new Error('The initial machine state must exist.');
  for (const state of Object.values(machine.states)) {
    for (const target of Object.values(state.on ?? {})) {
      if (!machine.states[target])
        throw new Error(`Unknown machine state: ${target}`);
    }
  }
}
