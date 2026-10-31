import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, Copy, MessageSquarePlus, Send } from 'lucide-react';
import { Button } from '../../src/components/ui/button';
import { Field, FieldLabel } from '../../src/components/ui/field';
import { Textarea } from '../../src/components/ui/textarea';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '../../src/components/ui/toggle-group';
import { CommentThread } from '../../src/xuui/CommentThread';
import { ReviewReceipt } from '../../src/xuui/ReviewReceipt';
import type { StudioBindings } from '../../src/xuui/parameters';
import './threads.css';

type Note = { id: string; variant: string; target: string; body: string };
type SampleReview = {
  id: string;
  time: string;
  read: boolean;
  comments: Note[];
};
const initial: SampleReview[] = [
  {
    id: 'latest',
    time: '00:27',
    read: false,
    comments: [
      {
        id: 'heading',
        variant: 'Paper',
        target: 'Heading',
        body: 'Give the heading a little more room. Another 8px above it should do it.',
      },
      {
        id: 'action',
        variant: 'Paper',
        target: 'Save a seat',
        body: 'Keep the primary action and Details on the same baseline.',
      },
      {
        id: 'night',
        variant: 'After hours',
        target: 'Card',
        body: 'This darker direction feels right. Keep it as a branch to explore.',
      },
    ],
  },
  {
    id: 'earlier',
    time: '00:12',
    read: true,
    comments: [
      {
        id: 'copy',
        variant: 'Paper',
        target: 'Description',
        body: 'The description can be quieter than the headline.',
      },
      {
        id: 'radius',
        variant: 'Paper',
        target: 'Card',
        body: 'Try a softer corner radius without making the card feel pill-shaped.',
      },
    ],
  },
];
const readTimestamp = '2026-10-31T00:28:00.000Z';
const longAddition =
  ' Make sure this still holds when the wording gets longer, the sidebar gets narrower, and we compare it with the other directions. The full comment should remain readable without opening another view.';

/** Keep the approved, annotated example reviewable, using the production card. */
export function ThreadsExample({ props, state, machine }: StudioBindings) {
  const headingId = useId();
  const inputId = useId();
  const [packets, setPackets] = useState(initial);
  const [filter, setFilter] = useState('all');
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Note[]>([]);
  const [copied, setCopied] = useState('');
  const [fallback, setFallback] = useState('');
  const scroll = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const read = machine?.value === 'read';
  const reviews = packets
    .map((packet, index) => (index === 0 ? { ...packet, read } : packet))
    .filter((packet) => filter !== 'unread' || !packet.read);
  const long = state.longComments === true;
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const update = () =>
      setMoreBelow(
        element.scrollHeight - element.clientHeight - element.scrollTop > 2,
      );
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    element.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', update);
    };
  }, [long, filter, packets, read]);
  const copy = async (note: Note) => {
    const output = `${note.variant} / ${note.target}\n${note.body}`;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(note.id);
      setFallback('');
    } catch {
      setFallback(output);
    }
  };
  return (
    <section
      className="studio-chrome comments-example"
      aria-labelledby={headingId}
      style={
        {
          '--comment-panel-width': `${Number(props.panelWidth) || 280}px`,
        } as CSSProperties
      }
    >
      <header className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-xs font-semibold">
          Comments
        </h2>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Write a comment"
          onClick={() => setComposing((value) => !value)}
        >
          <MessageSquarePlus data-icon="inline-start" />
        </Button>
      </header>
      <ToggleGroup
        value={[filter]}
        onValueChange={(values) => {
          if (values[0]) setFilter(values[0]);
        }}
        size="sm"
        aria-label="Comment filter"
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
      </ToggleGroup>
      {composing && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            setDrafts((previous) => [
              ...previous,
              {
                id: crypto.randomUUID(),
                variant: 'Paper',
                target: 'Card content',
                body: text.trim(),
              },
            ]);
            setText('');
            setComposing(false);
          }}
        >
          <Field>
            <FieldLabel htmlFor={inputId} className="sr-only">
              Comment
            </FieldLabel>
            <Textarea
              autoFocus
              id={inputId}
              placeholder="What should change?"
              value={text}
              maxLength={4000}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="xs"
              type="button"
              onClick={() => setComposing(false)}
            >
              Cancel
            </Button>
            <Button size="xs" type="submit" disabled={!text.trim()}>
              Add to review
            </Button>
          </div>
        </form>
      )}
      {drafts.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            Draft review
          </p>
          <ol className="flex flex-col gap-2">
            {drafts.map((note) => (
              <CommentThread
                key={note.id}
                commentId={note.id}
                variant={note.variant}
                target={state.targets !== false ? note.target : undefined}
                body={note.body}
              />
            ))}
          </ol>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              setPackets((previous) => [
                {
                  id: crypto.randomUUID(),
                  time: 'Now',
                  read: false,
                  comments: drafts,
                },
                ...previous.map((packet, index) =>
                  index === 0 ? { ...packet, read } : packet,
                ),
              ]);
              setDrafts([]);
              machine?.send('Submit');
            }}
          >
            <Send data-icon="inline-start" />
            Submit review
          </Button>
        </div>
      )}
      <div
        ref={scroll}
        className="comments-example-scroll"
        aria-label="Submitted reviews"
      >
        <ol className="flex flex-col gap-2">
          {reviews.flatMap((packet) =>
            packet.comments.map((note) => (
              <CommentThread
                key={note.id}
                commentId={note.id}
                variant={note.variant}
                target={state.targets !== false ? note.target : undefined}
                body={note.body + (long ? longAddition : '')}
                footer={
                  <>
                    <ReviewReceipt
                      readAt={packet.read ? readTimestamp : null}
                    />
                    <span className="ms-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                      {packet.time}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={
                        copied === note.id
                          ? 'Comment copied'
                          : `Copy comment on ${note.target}`
                      }
                      onClick={() => void copy(note)}
                    >
                      {copied === note.id ? (
                        <Check data-icon="inline-start" />
                      ) : (
                        <Copy data-icon="inline-start" />
                      )}
                    </Button>
                  </>
                }
              />
            )),
          )}
        </ol>
        {!reviews.length && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            All reviews have been read.
          </p>
        )}
      </div>
      {moreBelow && (
        <p className="text-center text-[10px] text-muted-foreground">
          Scroll for earlier feedback
        </p>
      )}
      {fallback && (
        <Field>
          <FieldLabel htmlFor={`${inputId}-copy`}>Select and copy</FieldLabel>
          <Textarea
            id={`${inputId}-copy`}
            value={fallback}
            readOnly
            onFocus={(event) => event.target.select()}
          />
        </Field>
      )}
    </section>
  );
}
