"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Catches thrown errors across /dashboard/*. The pages handle `!res.ok` themselves;
// this covers the case they can't — a *rejected* fetch (backend unreachable), which
// would otherwise surface as a bare 500. Uses unstable_retry (re-fetches the segment)
// rather than reset (which only clears error state without refetching).
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        This page couldn&apos;t load. The backend may be unreachable — check it&apos;s running and
        try again.
        {error.digest && <span className="ml-1 font-mono text-xs">({error.digest})</span>}
      </p>
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </div>
  );
}
