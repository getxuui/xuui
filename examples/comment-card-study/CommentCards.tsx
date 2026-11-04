import type { ReactNode } from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { ReviewReceipt } from '../../src/xuui/ReviewReceipt';

/* Comment cards as the sidebar lists them, drawn with the studio's own pin,
   receipt and tokens. Only the card's background and number change. */

type Card = {
  number: number;
  body: string;
  state: 'draft' | 'awaiting' | 'read';
  time?: string;
};

const cards: Card[] = [
  {
    number: 21,
    body: 'Tighten the heading so it sits on one line.',
    state: 'draft',
  },
  {
    number: 20,
    body: 'More options for how these can be more clearly children of the parent.',
    state: 'awaiting',
    time: '13:39',
  },
  {
    number: 19,
    body: 'let’s go with this option',
    state: 'read',
    time: '13:20',
  },
];

export type Style = {
  /** The card's surface, optionally depending on the card. */
  card: string | ((card: Card) => string);
  /** Separates cards when they have no surface of their own. */
  list?: string;
  number: (card: Card) => ReactNode;
  /** Put the number beside the text instead of above it. */
  gutter?: boolean;
};

function Pin({ number, className }: { number: number; className?: string }) {
  return (
    <span
      className={cn(
        'feedback-pin comment-number static grid size-5 shrink-0 place-items-center',
        className,
      )}
    >
      {number}
    </span>
  );
}

const footer = (card: Card) =>
  card.state === 'draft' ? (
    <span className="text-[11px] text-muted-foreground">Draft</span>
  ) : (
    <>
      <ReviewReceipt readAt={card.state === 'read' ? 'read' : null} />
      <time className="ms-auto shrink-0 font-mono text-[10px] text-muted-foreground">
        {card.time}
      </time>
      <Button variant="ghost" size="icon-xs" aria-label="Copy comment">
        <Copy data-icon="inline-start" />
      </Button>
    </>
  );

const actions = (card: Card) =>
  card.state === 'draft' && (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon-xs" aria-label="Edit comment">
        <Pencil data-icon="inline-start" />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Delete comment">
        <Trash2 data-icon="inline-start" />
      </Button>
    </div>
  );

function CardItem({ card, style }: { card: Card; style: Style }) {
  const body = (
    <p className="text-xs leading-[1.5] wrap-anywhere">{card.body}</p>
  );
  return (
    <li
      className={cn(
        'relative min-w-0 text-start',
        typeof style.card === 'string' ? style.card : style.card(card),
      )}
      data-xuui-layer-name={`Comment ${card.number}`}
    >
      {style.gutter ? (
        <div className="flex gap-2.5">
          <div className="pt-px">{style.number(card)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1">
              <div className="min-w-0 flex-1">{body}</div>
              {actions(card)}
            </div>
            <div className="mt-2 flex items-center gap-2">{footer(card)}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-start gap-1">
            {style.number(card)}
            <span className="flex-1" />
            {actions(card)}
          </div>
          <div className="mt-2">{body}</div>
          <div className="mt-2.5 flex items-center gap-2">{footer(card)}</div>
        </>
      )}
    </li>
  );
}

export function CommentList({ style }: { style: Style }) {
  return (
    <aside
      className="studio-chrome flex w-[256px] flex-col gap-3 bg-studio-background px-4 py-4 font-sans text-foreground"
      data-xuui-layer-name="Sidebar"
    >
      <h2 className="text-xs font-semibold">Comments</h2>
      <div className="flex gap-1 text-xs">
        <span className="rounded-lg bg-muted px-2.5 py-1 font-medium">All</span>
        <span className="px-2.5 py-1 text-muted-foreground">Unread</span>
      </div>
      <ul className={cn('flex flex-col gap-2', style.list)}>
        {cards.map((card) => (
          <CardItem key={card.number} card={card} style={style} />
        ))}
      </ul>
    </aside>
  );
}

export const styles = {
  current: {
    card: 'rounded-[10px] bg-muted p-3',
    number: (card) => <Pin number={card.number} />,
  },
  // Cards drop their fill and sit between hairlines, like a list.
  hairline: {
    card: 'py-3',
    list: 'gap-0 divide-y divide-border',
    number: (card) => <Pin number={card.number} />,
    gutter: true,
  },
  // An outline keeps each card an object without filling the sidebar.
  outline: {
    card: 'rounded-[10px] border border-border p-3',
    number: (card) => (
      <span className="font-mono text-[11px] font-medium text-(--brand-text)">
        #{card.number}
      </span>
    ),
  },
  // The pin moves into a gutter beside the text, saving a row per card.
  gutter: {
    card: 'rounded-[10px] bg-muted p-3',
    number: (card) => <Pin number={card.number} />,
    gutter: true,
  },
  // Drafts stand out with a brand tint; sent comments recede. The number is
  // a quiet outlined badge, so the pin colour stays on the canvas.
  state: {
    card: (card) =>
      card.state === 'draft'
        ? 'rounded-[10px] bg-brand/10 p-3 ring-1 ring-brand/25'
        : 'rounded-[10px] bg-muted/50 p-3',
    number: (card) => (
      <span
        className={cn(
          'grid h-5 min-w-5 place-items-center rounded-full border px-1 font-mono text-[10px] font-semibold',
          card.state === 'draft'
            ? 'border-brand bg-brand text-brand-foreground'
            : 'border-border text-muted-foreground',
        )}
      >
        {card.number}
      </span>
    ),
  },
} satisfies Record<string, Style>;

export function CurrentCards() {
  return <CommentList style={styles.current} />;
}
export function HairlineCards() {
  return <CommentList style={styles.hairline} />;
}
export function OutlineCards() {
  return <CommentList style={styles.outline} />;
}
export function GutterCards() {
  return <CommentList style={styles.gutter} />;
}
export function StateCards() {
  return <CommentList style={styles.state} />;
}
