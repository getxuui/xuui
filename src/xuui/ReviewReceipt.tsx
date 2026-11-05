import { CheckCheck, Clock3 } from 'lucide-react';

export function ReviewReceipt({ readAt }: { readAt?: string | null }) {
  const Icon = readAt ? CheckCheck : Clock3;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] leading-4 text-muted-foreground"
      data-review-read={Boolean(readAt)}
      title={readAt ? undefined : 'Awaiting agent'}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {readAt ? (
        'Read by agent'
      ) : (
        <span className="sr-only">Awaiting agent</span>
      )}
    </span>
  );
}
