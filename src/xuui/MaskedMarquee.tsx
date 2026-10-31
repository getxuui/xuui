import { useLayoutEffect, useRef } from 'react';

/** Reveal overflowing names on hover or keyboard focus without resizing the row. */
export function MaskedMarquee({ text }: { text: string }) {
  const viewport = useRef<HTMLSpanElement>(null);
  const content = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const clip = viewport.current;
    const label = content.current;
    if (!clip || !label) return;
    const host =
      clip.closest<HTMLElement>(
        '[data-marquee-host], [data-slot="select-trigger"], [data-slot="select-item"], [data-slot="select-label"]',
      ) ?? clip;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let overflow = 0;
    let offset = 0;
    let direction = 1;
    let last = 0;
    let pauseUntil = 0;
    let running = false;
    const masks = () => {
      const position = Math.abs(clip.scrollLeft);
      clip.style.setProperty(
        '--marquee-flow',
        getComputedStyle(clip).direction === 'rtl' ? 'to left' : 'to right',
      );
      clip.style.setProperty('--marquee-start', position > 1 ? '12px' : '0px');
      clip.style.setProperty(
        '--marquee-end',
        position < overflow - 1 ? '12px' : '0px',
      );
    };
    const tick = (now: number) => {
      if (!running) return;
      const elapsed = last ? Math.min(now - last, 50) : 0;
      last = now;
      if (now >= pauseUntil) {
        offset = Math.max(
          0,
          Math.min(overflow, offset + direction * elapsed * 0.035),
        );
        clip.scrollLeft =
          offset * (getComputedStyle(clip).direction === 'rtl' ? -1 : 1);
        masks();
        if (offset === overflow || offset === 0) {
          direction *= -1;
          pauseUntil = now + 900;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    const playback = () => {
      const active =
        host.matches(':hover, :focus-visible') ||
        host.hasAttribute('data-highlighted');
      if (active && overflow > 1 && !reducedMotion.matches) {
        if (running) return;
        running = true;
        last = 0;
        offset = Math.abs(clip.scrollLeft);
        pauseUntil = performance.now() + 650;
        frame = requestAnimationFrame(tick);
      } else {
        running = false;
        cancelAnimationFrame(frame);
        offset = 0;
        direction = 1;
        clip.scrollLeft = 0;
        masks();
      }
    };
    const measure = () => {
      overflow = Math.max(0, label.scrollWidth - clip.clientWidth);
      clip.dataset.overflow = String(overflow > 1);
      offset = Math.min(offset, overflow);
      masks();
      playback();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(clip);
    resize.observe(label);
    const highlight = new MutationObserver(playback);
    highlight.observe(host, {
      attributes: true,
      attributeFilter: ['data-highlighted'],
    });
    for (const event of ['pointerenter', 'pointerleave', 'focusin', 'focusout'])
      host.addEventListener(event, playback);
    clip.addEventListener('scroll', masks, { passive: true });
    reducedMotion.addEventListener('change', playback);
    measure();
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resize.disconnect();
      highlight.disconnect();
      for (const event of [
        'pointerenter',
        'pointerleave',
        'focusin',
        'focusout',
      ])
        host.removeEventListener(event, playback);
      clip.removeEventListener('scroll', masks);
      reducedMotion.removeEventListener('change', playback);
    };
  }, [text]);
  return (
    <span
      ref={viewport}
      data-marquee
      className="masked-marquee block min-w-0 flex-1 overflow-x-auto whitespace-nowrap"
    >
      <span ref={content} className="inline-block w-max">
        {text}
      </span>
    </span>
  );
}
