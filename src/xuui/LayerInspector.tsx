import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { layerIcons } from './layerIdentity';
import type { LayerProperties, LayerProperty } from './layerProperties';

type CopyResult = { label: string; value: string; copied: boolean };

function Readout({
  label,
  value,
  color,
  abbreviation,
  fullWidth = false,
  copied,
  onCopy,
}: LayerProperty & {
  abbreviation?: string;
  fullWidth?: boolean;
  copied: CopyResult | null;
  onCopy: (property: LayerProperty) => void;
}) {
  const font = label === 'Font';
  const hex = color && /^#[\da-f]{6}([\da-f]{2})?$/i.test(value) ? value : null;
  const opacity = hex
    ? hex.length === 9
      ? Math.round((parseInt(hex.slice(-2), 16) / 255) * 100)
      : 100
    : null;
  const displayed = hex ? hex.slice(0, 7) : value;
  const unit = displayed.match(/^(-?[\d.]+)(px|%)$/);
  const isCopied =
    copied?.copied && copied.label === label && copied.value === value;
  return (
    <div className={cn('layer-readout min-w-0', fullWidth && 'col-span-full')}>
      <dt className="sr-only">{label}</dt>
      <dd>
        <Button
          variant="secondary"
          size="sm"
          className="layer-property-copy relative h-auto min-h-8 w-full justify-between gap-2 py-1"
          aria-label={`Copy ${label}: ${value}`}
          title={`Copy ${label.toLowerCase()}`}
          data-copied={isCopied || undefined}
          onClick={() => onCopy({ label, value })}
        >
          <span
            aria-hidden="true"
            className="shrink-0 text-xs font-normal text-muted-foreground"
          >
            {abbreviation ?? label}
          </span>
          {/* The tick replaces the value in place, so the row keeps its size. */}
          <span
            className={cn(
              'flex min-w-0 items-center justify-end gap-2',
              color && 'layer-color-value',
              isCopied && 'invisible',
            )}
          >
            {color && (
              <span
                aria-hidden="true"
                className="relative size-3.5 shrink-0 overflow-hidden rounded-sm border border-foreground/10"
                style={{
                  backgroundImage:
                    'conic-gradient(var(--border) 25%, var(--background) 0 50%, var(--border) 0 75%, var(--background) 0)',
                  backgroundSize: '6px 6px',
                }}
              >
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: color }}
                />
              </span>
            )}
            <bdi
              data-layer-value
              dir={font ? 'auto' : 'ltr'}
              className={cn(
                'min-w-0 text-end text-xs whitespace-normal wrap-anywhere',
                font ? 'font-medium' : 'font-mono font-normal tabular-nums',
              )}
            >
              {unit ? (
                <>
                  {unit[1]}
                  <span className="ms-1 text-[10px] text-muted-foreground">
                    {unit[2]}
                  </span>
                </>
              ) : (
                displayed
              )}
            </bdi>
            {opacity !== null && (
              <span className="layer-color-opacity shrink-0 font-mono text-[10px] font-normal text-muted-foreground">
                <span className="sr-only">Opacity </span>
                <bdi dir="ltr">{opacity}%</bdi>
              </span>
            )}
          </span>
          {isCopied && (
            <Check
              data-icon="inline-end"
              aria-hidden="true"
              className="absolute end-2.5 top-1/2 -translate-y-1/2"
            />
          )}
        </Button>
      </dd>
    </div>
  );
}

function PropertyGroup({
  title,
  children,
  geometry = false,
}: {
  title: string;
  children: ReactNode;
  geometry?: boolean;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h3 className="text-xs font-semibold">{title}</h3>
      <dl
        aria-label={geometry ? 'Geometry' : title}
        className="layer-inspector-grid grid min-w-0 grid-cols-2 gap-2"
      >
        {children}
      </dl>
    </section>
  );
}

export function LayerInspector({
  layer,
  action,
}: {
  layer: LayerProperties;
  action?: ReactNode;
}) {
  const { x, y, width, height } = layer.bounds;
  const Icon = layer.count > 1 ? Layers : layerIcons[layer.kind];
  const [copied, setCopied] = useState<CopyResult | null>(null);
  useEffect(() => {
    if (!copied?.copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  useEffect(() => setCopied(null), [layer.name, layer.variantId]);
  const copy = async ({ label, value }: LayerProperty) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied({ label, value, copied: true });
    } catch {
      setCopied({ label, value, copied: false });
    }
  };
  const readoutProps = { copied, onCopy: copy };
  return (
    <section
      aria-label={layer.count === 1 ? 'Selected layer' : 'Selected layers'}
      className="layer-inspector flex min-w-0 flex-col gap-5"
    >
      <header className="flex min-w-0 items-start gap-2">
        <Icon
          aria-hidden="true"
          size={15}
          strokeWidth={1.6}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            title={layer.name}
            className="min-w-0 truncate text-xs leading-5 font-semibold"
          >
            {layer.name}
          </h2>
          {layer.tag && (
            <span className="text-[11px] text-muted-foreground">
              {layer.tag}
            </span>
          )}
        </div>
        {action}
      </header>
      <Separator />
      <PropertyGroup title="Position & size" geometry>
        {layer.position && (
          <Readout
            label="Position"
            value={layer.position}
            fullWidth
            {...readoutProps}
          />
        )}
        <Readout label="X" value={`${x}px`} {...readoutProps} />
        <Readout label="Y" value={`${y}px`} {...readoutProps} />
        <Readout
          label="Width"
          abbreviation="W"
          value={`${width}px`}
          {...readoutProps}
        />
        <Readout
          label="Height"
          abbreviation="H"
          value={`${height}px`}
          {...readoutProps}
        />
      </PropertyGroup>
      {layer.typography.length > 0 && (
        <>
          <Separator />
          <PropertyGroup title="Typography">
            {layer.typography.map((property) => (
              <Readout
                key={property.label}
                {...property}
                fullWidth={!['Size', 'Weight'].includes(property.label)}
                {...readoutProps}
              />
            ))}
          </PropertyGroup>
        </>
      )}
      {layer.appearance.length > 0 && (
        <>
          <Separator />
          <PropertyGroup title="Appearance">
            {layer.appearance.map((property) => (
              <Readout
                key={property.label}
                {...property}
                fullWidth
                {...readoutProps}
              />
            ))}
          </PropertyGroup>
        </>
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Copy aria-hidden="true" size={12} />
        Click a value to copy
      </p>
      <p role="status" className="sr-only">
        {copied?.copied ? `Copied ${copied.label}: ${copied.value}` : ''}
      </p>
      {copied && !copied.copied && (
        <Field>
          <FieldLabel htmlFor="copy-layer-value">
            Select and copy {copied.label.toLowerCase()}
          </FieldLabel>
          <Input
            id="copy-layer-value"
            readOnly
            value={copied.value}
            onFocus={(event) => event.target.select()}
          />
        </Field>
      )}
    </section>
  );
}
