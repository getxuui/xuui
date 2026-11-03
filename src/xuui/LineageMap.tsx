import { useLayoutEffect, useRef, useState } from 'react';
import type { LineageComment, LineageEdge } from './lineage';

type Box = { x: number; y: number; width: number; height: number };

function Pin({ number }: { number: number }) {
  return (
    <span aria-hidden="true" className="feedback-pin lineage-pin">
      {number}
    </span>
  );
}

function Quote({
  comment,
  repeated,
}: {
  comment: LineageComment;
  repeated: boolean;
}) {
  return (
    <p
      className={repeated ? 'lineage-label lineage-label-pin' : 'lineage-label'}
    >
      <Pin number={comment.number} />
      {repeated ? (
        <span className="sr-only">Comment {comment.number}, as above</span>
      ) : (
        <span className="lineage-text">“{comment.body}”</span>
      )}
    </p>
  );
}

/** On-screen width a comment needs before its text is shown in full. */
const readableWidth = 240;

/**
 * Lines between variants and the review comments that led from one to the
 * next. It sits inside the canvas scene, so it pans and zooms with the frames;
 * positions are measured in the scene's own, unscaled coordinates. Labels keep
 * their on-screen size at any zoom, like comment pins, and shrink to their pin
 * when there isn't room for the text; hovering shows it.
 */
export function LineageMap({
  edges,
  verdicts,
}: {
  edges: LineageEdge[];
  verdicts: Map<string, LineageComment[]>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    let frame = 0;
    let previous = '';
    const round = (value: number) => Math.round(value * 2) / 2;
    const measure = () => {
      const container = root.current?.parentElement;
      if (container) {
        const scene = container.closest<HTMLElement>('[data-canvas-scene]');
        const scale = Number(scene?.dataset.canvasScale) || 1;
        const origin = container.getBoundingClientRect();
        const next: Record<string, Box> = {};
        container
          .querySelectorAll<HTMLElement>('[data-variant-id]')
          .forEach((variant) => {
            const design =
              variant.querySelector('[data-xuui-design]') ?? variant;
            const rect = design.getBoundingClientRect();
            next[variant.dataset.variantId!] = {
              x: round((rect.x - origin.x) / scale),
              y: round((rect.y - origin.y) / scale),
              width: round(rect.width / scale),
              height: round(rect.height / scale),
            };
          });
        const key = JSON.stringify(next);
        if (key !== previous) {
          previous = key;
          setBoxes(next);
        }
        setScale(Math.round(scale * 1000) / 1000);
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, []);

  const placed = edges.flatMap((edge) => {
    const a = boxes[edge.from];
    const b = boxes[edge.to];
    if (!a || !b) return [];
    const start = { x: a.x + a.width, y: a.y + a.height / 2 };
    const end = { x: b.x, y: b.y + b.height / 2 };
    return [{ edge, start, end }];
  });
  return (
    <div ref={root} data-lineage-map className="lineage-map">
      <svg aria-hidden="true" className="lineage-lines" width="1" height="1">
        {placed.map(({ edge, start, end }) => {
          const bend = (end.x - start.x) / 2;
          return (
            <path
              key={`${edge.from}:${edge.to}`}
              data-lineage-line={`${edge.from}:${edge.to}`}
              vectorEffect="non-scaling-stroke"
              d={`M${start.x} ${start.y} C${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`}
            />
          );
        })}
      </svg>
      {placed
        .filter(({ edge }) => edge.comments.length)
        .map(({ edge, start, end }) => (
          <div
            key={`label:${edge.from}:${edge.to}`}
            data-lineage-label={`${edge.from}:${edge.to}`}
            data-compact={
              (end.x - start.x) * scale < readableWidth || undefined
            }
            className="lineage-labels"
            style={{
              left: (start.x + end.x) / 2,
              top: (start.y + end.y) / 2,
              scale: 1 / scale,
            }}
          >
            {edge.comments.map((comment) => (
              <Quote
                key={comment.id}
                comment={comment}
                repeated={edge.repeated.has(comment.id)}
              />
            ))}
          </div>
        ))}
      {[...verdicts].map(([id, comments]) => {
        const box = boxes[id];
        if (!box) return null;
        return (
          <div
            key={`verdict:${id}`}
            data-lineage-verdict={id}
            data-compact={scale < 0.5 || undefined}
            className="lineage-labels lineage-verdict"
            style={{
              left: box.x + box.width + 20 / scale,
              top: box.y + box.height / 2,
              scale: 1 / scale,
            }}
          >
            {comments.map((comment) => (
              <Quote key={comment.id} comment={comment} repeated={false} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
