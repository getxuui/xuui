import type { CSSProperties } from 'react';
import { ArrowUpRight, Check, Heart, Sprout } from 'lucide-react';
import type { StudioBindings } from '../../src/xuui/parameters';
import './tickets.css';

function TicketCard({
  tone,
  props,
  state,
  machine,
}: StudioBindings & { tone: 'botanical' | 'night' | 'morning' }) {
  const reserved = machine?.value === 'reserved';
  return (
    <article
      className={`ticket-card ticket-${tone}`}
      style={
        {
          borderRadius: Number(props.borderRadius),
          '--ticket-accent': String(props.color),
          '--ticket-weight': Number(props.fontWeight),
        } as CSSProperties
      }
    >
      <header className="ticket-header">
        <span>{state.loggedIn ? 'WELCOME BACK' : 'FIELDNOTES'}</span>
        <Heart
          size={15}
          fill={state.favourited ? 'currentColor' : 'none'}
          aria-label={state.favourited ? 'Favourited' : 'Not favourited'}
        />
      </header>
      <div className="ticket-intro">
        <span className="ticket-edition">SUNDAY SESSION / Nº 015</span>
        <h2>
          {tone === 'night' ? (
            <>
              A little
              <br />
              less rush.
            </>
          ) : (
            <>
              The art
              <br />
              of noticing.
            </>
          )}
        </h2>
        <p>
          A slow walk. A fresh perspective.
          <br />A little room for the everyday.
        </p>
        <span aria-hidden="true" className="ticket-stamp">
          <Sprout size={40} strokeWidth={1} />
        </span>
      </div>
      <div className="ticket-perforation" aria-hidden="true">
        <i />
        <span />
        <i />
      </div>
      <div className="ticket-stub">
        <div className="ticket-meta">
          <div>
            <span>WHEN</span>
            <strong>Sun, 15 Nov</strong>
            <small>10:00–12:00</small>
          </div>
          <div>
            <span>WHERE</span>
            <strong>Amsterdam</strong>
            <small>One seat. A little space.</small>
          </div>
        </div>
        <button
          className="ticket-reserve"
          onClick={() => machine?.send(reserved ? 'Cancel' : 'Reserve')}
          aria-pressed={reserved}
        >
          {reserved ? 'You’re on the list' : 'Save a seat'}
          {reserved ? <Check size={16} /> : <ArrowUpRight size={16} />}
        </button>
        <footer>
          <span>ADMIT ONE · COME AS YOU ARE</span>
          <span>015—AMS</span>
        </footer>
      </div>
    </article>
  );
}

export const BotanicalTicket = (bindings: StudioBindings) => (
  <TicketCard {...bindings} tone="botanical" />
);
export const NightTicket = (bindings: StudioBindings) => (
  <TicketCard {...bindings} tone="night" />
);
export const MorningTicket = (bindings: StudioBindings) => (
  <TicketCard {...bindings} tone="morning" />
);
