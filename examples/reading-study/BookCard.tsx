import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowUpRight, BookOpen, Check, Heart, Plus } from 'lucide-react';
import type { StudioBindings } from '../../src/xuui/parameters';
import './books.css';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/fraunces';

function BookCard({
  edition,
  props,
  state,
  machine,
}: StudioBindings & { edition: 'cover' | 'editorial' | 'night' }) {
  const [saved, setSaved] = useState(false);
  const [excerpt, setExcerpt] = useState(false);
  const excerptId = useId();
  const added = machine?.value === 'added';
  const title = String(props.title);
  return (
    <article
      className={`reading-card reading-${edition}`}
      style={
        {
          borderRadius: Number(props.borderRadius),
          '--reading-accent': String(props.color),
          '--reading-weight': Number(props.fontWeight),
          '--reading-title-font': props.titleFont || 'Georgia, serif',
        } as CSSProperties
      }
    >
      <header className="reading-topline">
        <span>
          <BookOpen size={12} /> Reading room
        </span>
        <button
          type="button"
          className="reading-save"
          aria-label={
            saved ? 'Remove from reading list' : 'Save to reading list'
          }
          aria-pressed={saved}
          onClick={() => setSaved(!saved)}
        >
          <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </header>
      <div className="reading-art" aria-hidden="true">
        <div className="reading-book">
          <span className="reading-book-series">FIELD STUDIES / 01</span>
          <h3>{title}</h3>
          <svg viewBox="0 0 180 130" fill="none">
            <circle cx="132" cy="38" r="24" fill="#e3bf78" />
            <path d="M0 82 44 41 113 104 155 66 180 81V130H0Z" fill="#a9b6a2" />
            <path d="m0 105 71-40 73 49 36-19v35H0Z" fill="#718c82" />
            <path d="M0 113c47-23 85 28 180-9v26H0Z" fill="#d6dac2" />
            <path
              d="M0 121c55-15 102 21 180-8M0 128c59-14 115 19 180-8"
              stroke="#486b63"
              strokeWidth=".6"
            />
          </svg>
          <span className="reading-book-author">MARA ELLIOTT</span>
        </div>
        <span className="reading-art-note">
          A FIELD GUIDE TO TAKING THE LONG WAY HOME
        </span>
      </div>
      <div className="reading-info">
        <span className="reading-kicker">
          {edition === 'night'
            ? 'FOR THE LATE HOURS'
            : edition === 'editorial'
              ? 'ON OUR READING TABLE'
              : 'SMALL PRESS, BIG OUTSIDE'}
        </span>
        <h2>{title}</h2>
        <p className="reading-author">
          Mara Elliott <span>·</span> First edition
        </p>
        {state.summary && (
          <p className="reading-summary">
            Places to wander. Things to notice. A little permission to lose your
            way.
          </p>
        )}
        <button
          type="button"
          className="reading-excerpt-toggle"
          aria-expanded={excerpt}
          aria-controls={excerptId}
          onClick={() => setExcerpt(!excerpt)}
        >
          {excerpt ? 'Close excerpt' : 'Read an excerpt'}{' '}
          <ArrowUpRight size={13} />
        </button>
        {excerpt && (
          <p id={excerptId} className="reading-excerpt">
            “Start with the path you usually pass by. Follow it until you stop
            counting the minutes. An atlas can tell you where you are; the rest
            is up to you.”
          </p>
        )}
      </div>
      <footer className="reading-footer">
        <div className="reading-price">
          <strong>€24</strong>
          <span>Hardback · 184 pages</span>
        </div>
        <button
          type="button"
          className="reading-buy"
          aria-pressed={added}
          onClick={() => machine?.send(added ? 'Remove' : 'Add')}
        >
          {added ? 'Added to bag' : 'Add to bag'}
          {added ? <Check size={14} /> : <Plus size={14} />}
        </button>
      </footer>
    </article>
  );
}

export const CoverCard = (bindings: StudioBindings) => (
  <BookCard {...bindings} edition="cover" />
);
export const EditorialCard = (bindings: StudioBindings) => (
  <BookCard {...bindings} edition="editorial" />
);
export const NightCard = (bindings: StudioBindings) => (
  <BookCard {...bindings} edition="night" />
);
