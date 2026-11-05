import { useEffect, useRef, useState } from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { Input as InputPrimitive } from '@base-ui/react/input';

export function ParameterSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const steps = (max - min) / step;
  const showTicks = Number.isInteger(steps) && steps >= 2 && steps <= 12;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  const commit = () => {
    const number = Number(draft);
    if (draft.trim() && Number.isFinite(number))
      onChange(
        Math.max(
          min,
          Math.min(max, Math.round((number - min) / step) * step + min),
        ),
      );
    setEditing(false);
  };
  return (
    <div className="parameter-slider relative h-(--studio-control-height) w-full rounded-[10px] bg-muted">
      <SliderPrimitive.Root
        className="group/parameter size-full"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
        thumbAlignment="edge"
      >
        <SliderPrimitive.Control className="relative flex size-full touch-none items-center select-none">
          <SliderPrimitive.Track
            className="absolute inset-0 overflow-hidden rounded-[10px]"
            style={{ position: 'absolute', height: '100%' }}
          >
            <SliderPrimitive.Indicator
              className="absolute inset-y-0 left-0 bg-slider-fill"
              data-parameter-fill
              style={{
                height: '100%',
                width: `${((value - min) / (max - min)) * 100}%`,
              }}
            />
            {showTicks &&
              Array.from({ length: steps + 1 }, (_, index) => {
                const fraction = index / steps;
                return (
                  <span
                    key={index}
                    aria-hidden="true"
                    data-parameter-tick
                    className="pointer-events-none absolute inset-y-2.5 w-px bg-foreground/12"
                    style={{
                      left: `calc(${fraction * 100}% + ${1.5 - fraction * 3}px)`,
                    }}
                  />
                );
              })}
          </SliderPrimitive.Track>
          <span
            aria-hidden="true"
            className="parameter-slider-label pointer-events-none relative pl-2.5 text-xs"
          >
            {label}
          </span>
          <SliderPrimitive.Thumb
            aria-label={label}
            className="relative block h-3 w-[3px] rounded-full bg-muted-foreground opacity-0 outline-none group-hover/parameter:opacity-100 group-data-dragging/parameter:opacity-100 has-[:focus-visible]:opacity-100 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring after:absolute after:-inset-2"
          />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
      {editing ? (
        <InputPrimitive
          ref={input}
          aria-label={`${label} value`}
          type="text"
          inputMode="decimal"
          className="absolute top-1/2 right-2 h-6 w-14 -translate-y-1/2 rounded-md border border-border bg-background px-1 font-mono text-xs text-foreground outline-none"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            const number = Number(event.target.value);
            if (
              event.target.value.trim() &&
              Number.isFinite(number) &&
              number >= min &&
              number <= max
            )
              onChange(number);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          aria-label={`Edit ${label}`}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            setDraft(String(value));
            setEditing(true);
          }}
        >
          {value}
          {unit ? (
            <span className="ml-0.5 text-muted-foreground">{unit}</span>
          ) : null}
        </button>
      )}
    </div>
  );
}
