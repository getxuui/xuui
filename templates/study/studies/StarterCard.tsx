import { useState } from 'react';
import type { StudioBindings } from '@getxuui/xuui';
import './starter.css';

export function StarterCard({ props }: StudioBindings) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="starter-card" data-xuui-layer-name="Starter card">
      <span className="starter-eyebrow">YOUR FIRST STUDY</span>
      <h2>{String(props.title)}</h2>
      <p>
        Put a real design here. Compare directions, try the interactions, and
        leave feedback on the details.
      </p>
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => setSaved(!saved)}
      >
        {saved ? 'Saved' : 'Save this idea'}
      </button>
    </article>
  );
}
