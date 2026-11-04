import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Frame, Link, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { selectorFor } from './feedback';

export function VariantLabel({
  studyId,
  variant,
  active,
  comparison,
  selection,
  onSelect,
  onOpen,
}: {
  studyId: string;
  variant: { id: string; name: string; labels?: string[] };
  active: boolean;
  comparison: boolean;
  selection: Element[];
  onSelect: () => void;
  /** Open the variant on its own, from All. */
  onOpen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (fallback) {
      input.current?.focus();
      input.current?.select();
    }
  }, [fallback]);
  const copy = useCallback(
    async (layers: Element[] = []) => {
      const url = new URL(window.location.href);
      url.search = new URLSearchParams({
        study: studyId,
        variant: variant.id,
      }).toString();
      url.hash = '';
      for (const element of layers)
        url.searchParams.append('layer', selectorFor(element, variant.id));
      try {
        await navigator.clipboard.writeText(url.href);
        setFallback('');
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setFallback(url.href);
        input.current?.focus();
        input.current?.select();
      }
    },
    [studyId, variant.id],
  );
  useEffect(() => {
    if (!active) return;
    const copyLink = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'l' ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.repeat ||
        event.isComposing ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest(
              'input, textarea, select, [role="textbox"], [data-xuui-comment-editor]',
            )))
      )
        return;
      event.preventDefault();
      void copy(selection.filter((element) => element.isConnected));
    };
    window.addEventListener('keydown', copyLink, true);
    return () => window.removeEventListener('keydown', copyLink, true);
  }, [active, copy, selection]);
  const Icon = copied ? Check : Link;
  return (
    <div
      data-workspace-control
      data-frame-title
      className="group/frame-title absolute top-[52px] left-[80px] z-20 flex h-5 items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
    >
      <Frame aria-hidden="true" size={12} strokeWidth={1.5} />
      <Button
        variant="ghost"
        size="sm"
        className="frame-title-name h-5 rounded-none px-0 text-[11px] font-medium text-muted-foreground aria-pressed:text-foreground"
        aria-pressed={comparison ? active : undefined}
        title={comparison ? 'Double-click to open' : undefined}
        onClick={onSelect}
        onDoubleClick={comparison ? onOpen : undefined}
      >
        {variant.name}
      </Button>
      {variant.labels?.map((label) => (
        <span key={label} data-variant-label className="variant-label-tag">
          {label}
        </span>
      ))}
      <span className="-ml-1 flex items-center">
        {comparison && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="frame-title-open pointer-events-none size-5 opacity-0 transition-opacity group-hover/frame-title:pointer-events-auto group-hover/frame-title:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
            aria-label={`Open ${variant.name}`}
            title="Open variant"
            onClick={onOpen}
          >
            <Maximize2 data-icon="inline-start" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          className="frame-title-copy pointer-events-none size-5 opacity-0 transition-opacity group-hover/frame-title:pointer-events-auto group-hover/frame-title:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
          data-copy-variant-link={variant.id}
          aria-label={`Copy link to ${variant.name}`}
          aria-keyshortcuts={
            active && !selection.length ? 'Meta+L Control+L' : undefined
          }
          title={
            active && !selection.length
              ? 'Copy variant link (⌘L / Ctrl+L)'
              : 'Copy variant link'
          }
          onClick={() => void copy()}
        >
          <Icon data-icon="inline-start" />
        </Button>
      </span>
      <span role="status" className="sr-only">
        {copied ? 'Link copied' : ''}
      </span>
      {fallback && (
        <Input
          ref={input}
          readOnly
          aria-label={`Link to ${variant.name}`}
          className="absolute top-full left-0 mt-1 w-72 bg-popover"
          value={fallback}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setFallback('');
            }
          }}
        />
      )}
    </div>
  );
}
