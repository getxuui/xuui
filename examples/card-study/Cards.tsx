import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowRight, Check, Heart } from '@phosphor-icons/react';
import type { StudioBindings } from '../../src/xuui/parameters';
import './cards.css';

type CardVariant = 'paper' | 'after-hours';

function LeafStudy() {
  return (
    <div className="leaf-study" aria-hidden="true">
      <span className="sun-disc" />
      <span className="stem" data-xuui-layer-name="Stem" />
      {Array.from({ length: 6 }, (_, index) => (
        <span
          className={`leaf leaf-${index + 1}`}
          data-xuui-layer-name={`Leaf ${index + 1}`}
          key={index}
        />
      ))}
      <span className="ground-line" />
      <span className="art-caption">A study in slowing down</span>
    </div>
  );
}

/** Example UI has no knowledge of xuui or the review interface. */
function SundayCard({
  variant,
  borderRadius,
  fontWeight,
  color,
  favourited = false,
  loggedIn = false,
  reservation,
  onReservationChange,
}: {
  variant: CardVariant;
  borderRadius?: number;
  fontWeight?: number;
  color?: string;
  favourited?: boolean;
  loggedIn?: boolean;
  reservation?: boolean;
  onReservationChange?: () => void;
}) {
  const [localReserved, setReserved] = useState(false);
  const reserved = reservation ?? localReserved;
  const [details, setDetails] = useState(false);

  return (
    <article
      className={`sunday-card card-${variant}`}
      style={{ borderRadius, '--card-accent': color } as CSSProperties}
    >
      {variant === 'paper' && <LeafStudy />}
      <div className="card-content">
        <div className="card-eyebrow">
          <span className="card-brand">
            FIELDNOTES{' '}
            <Heart
              size={12}
              weight={favourited ? 'fill' : 'regular'}
              aria-label={favourited ? 'Favourited' : 'Not favourited'}
            />
          </span>
          <span>{loggedIn ? 'WELCOME BACK' : 'A SUNDAY SESSION'}</span>
        </div>
        {variant === 'after-hours' && (
          <span className="night-orbit" aria-hidden="true">
            ↗
          </span>
        )}
        <h2 style={{ fontWeight }}>
          {variant === 'after-hours' ? (
            <>
              A little
              <br />
              less rush.
            </>
          ) : (
            <>
              The art
              <br className="optional-break" /> of noticing.
            </>
          )}
        </h2>
        <p className="card-description">
          A slow walk. A fresh perspective.
          <br />A little room for the everyday.
        </p>
        <div className="event-details">
          <span>Sun, 15 Nov</span>
          <span>10:00–12:00</span>
          <span>Amsterdam</span>
        </div>
        {details && (
          <p className="expanded-details">
            Meet at the north entrance of Vondelpark. Bring a notebook and an
            open mind. All materials included.
          </p>
        )}
        <div className="card-actions">
          <button
            className={`reserve-button ${reserved ? 'reserved' : ''}`}
            style={{ backgroundColor: color }}
            aria-pressed={reserved}
            onClick={() =>
              onReservationChange
                ? onReservationChange()
                : setReserved(!reserved)
            }
          >
            {reserved ? (
              <>
                You’re on the list <Check size={16} />
              </>
            ) : (
              <>
                Save a seat <ArrowRight size={16} />
              </>
            )}
          </button>
          <button
            className="details-button"
            aria-expanded={details}
            onClick={() => setDetails(!details)}
          >
            {details ? 'Less detail' : 'Details'}
          </button>
        </div>
      </div>
    </article>
  );
}

function CardPreview({
  variant,
  props,
  state,
  machine,
}: StudioBindings & { variant: CardVariant }) {
  return (
    <SundayCard
      variant={variant}
      borderRadius={
        typeof props.borderRadius === 'number' ? props.borderRadius : undefined
      }
      fontWeight={
        typeof props.fontWeight === 'number' ? props.fontWeight : undefined
      }
      color={typeof props.color === 'string' ? props.color : undefined}
      favourited={state.favourited === true}
      loggedIn={state.loggedIn === true}
      reservation={machine ? machine.value === 'reserved' : undefined}
      onReservationChange={
        machine
          ? () =>
              machine.send(machine.value === 'reserved' ? 'Cancel' : 'Reserve')
          : undefined
      }
    />
  );
}
export function PaperCard(bindings: StudioBindings) {
  return <CardPreview variant="paper" {...bindings} />;
}
export function AfterHoursCard(bindings: StudioBindings) {
  return <CardPreview variant="after-hours" {...bindings} />;
}
