import { useEffect, useRef, useState } from 'react';
import { Input } from '@base-ui/react/input';

export function GuideEditor({
  axis,
  position,
  min,
  max,
  x,
  y,
  onPreview,
  onCommit,
  onRemove,
}: {
  axis: 'x' | 'y';
  position: number;
  min: number;
  max: number;
  x: number;
  y: number;
  onPreview: (value: number) => void;
  onCommit: (value: number) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(String(position));
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const original = useRef(position);
  const finished = useRef(false);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  const valid = (text: string) =>
    !!text.trim() &&
    Number.isFinite(Number(text)) &&
    Number(text) >= min &&
    Number(text) <= max;
  const commit = (blur = false) => {
    if (finished.current) return;
    if (!value.trim()) {
      finished.current = true;
      onRemove();
      return;
    }
    if (!valid(value)) {
      if (!blur) {
        setInvalid(true);
        return;
      }
      finished.current = true;
      onCommit(original.current);
      return;
    }
    finished.current = true;
    onCommit(Number(value));
  };
  return (
    <div
      data-workspace-control
      className="guide-editor pointer-events-auto absolute flex items-center gap-1.5 rounded-md border border-border bg-popover px-2 py-1 text-popover-foreground shadow-studio-floating"
      style={{ left: x, top: y }}
    >
      <label
        htmlFor="guide-position"
        className="font-mono text-[10px] text-muted-foreground"
      >
        {axis.toUpperCase()}
      </label>
      <Input
        ref={input}
        id="guide-position"
        type="text"
        inputMode="decimal"
        role="spinbutton"
        aria-label={`${axis.toUpperCase()} guide position`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={position}
        aria-invalid={invalid}
        className="h-6 w-16 min-w-0 border-0 bg-transparent p-0 font-mono text-xs text-foreground outline-none"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          setInvalid(false);
          if (valid(next)) onPreview(Number(next));
        }}
        onBlur={() => commit(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            finished.current = true;
            onCommit(original.current);
          }
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const next = Math.max(
              min,
              Math.min(
                max,
                position +
                  (event.key === 'ArrowUp' ? 1 : -1) *
                    (event.shiftKey ? 10 : 1),
              ),
            );
            setValue(String(next));
            onPreview(next);
          }
        }}
      />
      <span className="font-mono text-[10px] text-muted-foreground">px</span>
    </div>
  );
}
