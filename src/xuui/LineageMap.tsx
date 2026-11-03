import { useLayoutEffect, useRef, useState } from 'react';
import { findCommentElement } from './feedback';
import type { LineageEdge, PostedComment } from './lineage';

type Box = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

/**
 * Wires from each variant to the ones developed from it, and submitted
 * comments pinned where they were posted on their artboards, so a comment
 * keeps pointing at what it was about. It sits inside the canvas scene, so it
 * pans and zooms with the frames; positions are measured in the scene's own,
 * unscaled coordinates. Pins keep their on-screen size at any zoom and show
 * their text on hover.
 */
export function LineageMap({
  edges,
  comments,
}: {
  edges: LineageEdge[];
  comments: PostedComment[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [pins, setPins] = useState<Record<string, Point>>({});
  const [scale, setScale] = useState(1);
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  useLayoutEffect(() => {
    let frame = 0;
    let previous = '';
    const round = (value: number) => Math.round(value * 2) / 2;
    const measure = () => {
      const container = root.current?.parentElement;
      if (container) {
        const scene = container.closest<HTMLElement>('[data-canvas-scene]');
        const zoom = Number(scene?.dataset.canvasScale) || 1;
        const origin = container.getBoundingClientRect();
        const local = (rect: DOMRect): Box => ({
          x: round((rect.x - origin.x) / zoom),
          y: round((rect.y - origin.y) / zoom),
          width: round(rect.width / zoom),
          height: round(rect.height / zoom),
        });
        const nextBoxes: Record<string, Box> = {};
        container
          .querySelectorAll<HTMLElement>('[data-variant-id]')
          .forEach((variant) => {
            const design =
              variant.querySelector('[data-xuui-design]') ?? variant;
            nextBoxes[variant.dataset.variantId!] = local(
              design.getBoundingClientRect(),
            );
          });
        const nextPins: Record<string, Point> = {};
        for (const comment of commentsRef.current) {
          const element = findCommentElement(comment);
          if (!element || !container.contains(element)) continue;
          const box = local(element.getBoundingClientRect());
          const point = comment.target.pin ?? { x: 1, y: 0 };
          nextPins[comment.id] = {
            x: box.x + box.width * point.x,
            y: box.y + box.height * point.y,
          };
        }
        const key = JSON.stringify([nextBoxes, nextPins]);
        if (key !== previous) {
          previous = key;
          setBoxes(nextBoxes);
          setPins(nextPins);
        }
        setScale(Math.round(zoom * 1000) / 1000);
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={root} data-lineage-map className="lineage-map">
      <svg aria-hidden="true" className="lineage-lines" width="1" height="1">
        {edges.map((edge) => {
          const a = boxes[edge.from];
          const b = boxes[edge.to];
          if (!a || !b) return null;
          const start = { x: a.x + a.width, y: a.y + a.height / 2 };
          const end = { x: b.x, y: b.y + b.height / 2 };
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
      {comments.map((comment) => {
        const pin = pins[comment.id];
        if (!pin) return null;
        return (
          <p
            key={comment.id}
            data-lineage-comment={comment.id}
            className="lineage-comment"
            style={{ left: pin.x, top: pin.y, scale: 1 / scale }}
          >
            <span aria-hidden="true" className="feedback-pin lineage-pin">
              {comment.number}
            </span>
            <span className="lineage-text">“{comment.body}”</span>
          </p>
        );
      })}
    </div>
  );
}
