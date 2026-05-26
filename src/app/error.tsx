"use client";

import { ErrorState } from "@/ui/states";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-3">
      <ErrorState error={error} onRetry={reset} />
      {error.digest && (
        <p className="text-xs text-neutral-500">エラー ID: {error.digest}</p>
      )}
    </div>
  );
}
