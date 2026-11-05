import { LoaderCircle } from 'lucide-react';

export function VariantSpinner() {
  return (
    <LoaderCircle
      data-variant-spinner
      aria-hidden="true"
      size={12}
      strokeWidth={1.5}
      absoluteStrokeWidth
      className="variant-spinner shrink-0"
    />
  );
}
