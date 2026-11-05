import { useEffect, useState } from 'react';

/** A highlight that crosses a working surface, then resets outside its edges. */
export function WorkingGradient({
  id,
  startX,
  endX,
}: {
  id: string;
  startX: number;
  endX: number;
}) {
  const [motionAllowed, setMotionAllowed] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionAllowed(!preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  const pulseWidth = Math.max(24, Math.min(80, Math.abs(endX - startX) * 0.2));
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={-pulseWidth}
      y1={0}
      x2={pulseWidth}
      y2={0}
      gradientTransform={`translate(${(startX + endX) / 2} 0)`}
    >
      <stop offset="0" stopColor="var(--brand)" stopOpacity="0.2" />
      <stop offset="0.5" stopColor="var(--brand)" stopOpacity="1" />
      <stop offset="1" stopColor="var(--brand)" stopOpacity="0.2" />
      {motionAllowed && (
        <animateTransform
          attributeName="gradientTransform"
          type="translate"
          from={`${startX - pulseWidth} 0`}
          to={`${endX + pulseWidth} 0`}
          dur="1.8s"
          calcMode="linear"
          repeatCount="indefinite"
        />
      )}
    </linearGradient>
  );
}
