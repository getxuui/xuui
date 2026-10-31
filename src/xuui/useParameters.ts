import { useState } from 'react';
import type {
  Controls,
  ParameterValue,
  ParameterValues,
  StudioBindings,
} from './parameters';
import { valuesFor } from './parameters';

type Snapshot = {
  props?: ParameterValues;
  state?: ParameterValues;
  machine?: string;
};

export function useParameters(
  controls: Controls | undefined,
  iterationId: string,
) {
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const sendFor = (
    id: string,
    definition: Controls | undefined,
    event: string,
  ) => {
    const machine = definition?.machine;
    if (!machine) return;
    setSnapshots((previous) => {
      const snapshot = previous[id] ?? {};
      const current =
        snapshot.machine && machine.states[snapshot.machine]
          ? snapshot.machine
          : machine.initial;
      return {
        ...previous,
        [id]: {
          ...snapshot,
          machine: machine.states[current].on?.[event] ?? current,
        },
      };
    });
  };
  const bindingsFor = (
    id: string,
    definition: Controls | undefined,
  ): StudioBindings => {
    const snapshot = snapshots[id] ?? {};
    const machine = definition?.machine;
    const value =
      machine && snapshot.machine && machine.states[snapshot.machine]
        ? snapshot.machine
        : machine?.initial;
    return {
      props: valuesFor(definition?.props, snapshot.props),
      state: valuesFor(definition?.state, snapshot.state),
      ...(value
        ? {
            machine: {
              value,
              send: (event: string) => sendFor(id, definition, event),
            },
          }
        : {}),
    };
  };
  const bindings = bindingsFor(iterationId, controls);
  const setValue = (
    section: 'props' | 'state',
    key: string,
    value: ParameterValue,
  ) => {
    setSnapshots((previous) => ({
      ...previous,
      [iterationId]: {
        ...previous[iterationId],
        [section]: { ...previous[iterationId]?.[section], [key]: value },
      },
    }));
  };
  const setMachineState = (value: string) => {
    if (controls?.machine?.states[value])
      setSnapshots((previous) => ({
        ...previous,
        [iterationId]: { ...previous[iterationId], machine: value },
      }));
  };
  return {
    bindings,
    bindingsFor,
    setValue,
    machineState: bindings.machine?.value,
    setMachineState,
    send: (event: string) => sendFor(iterationId, controls, event),
  };
}
