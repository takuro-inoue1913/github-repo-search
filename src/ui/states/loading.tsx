type Props = { label?: string };

export function Loading({ label = "読み込み中..." }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 py-12 text-sm text-neutral-500"
    >
      <span
        aria-hidden
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"
      />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="animate-pulse rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div className="mb-3 h-4 w-1/3 rounded bg-neutral-200" />
      <div className="mb-2 h-3 w-full rounded bg-neutral-200" />
      <div className="h-3 w-2/3 rounded bg-neutral-200" />
    </div>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SkeletonCard />
        </li>
      ))}
    </ul>
  );
}
