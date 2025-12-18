"use client";

import { api } from "@/trpc/react";

export function HealthPing() {
  const { data, isLoading, isError, error, status, fetchStatus } = api.health.ping.useQuery(undefined, {
    retry: 1,
  });

  if (isLoading) {
    return <span className="text-sm text-muted-foreground">Pinging tRPC…</span>;
  }

  if (isError || !data?.ok) {
    return (
      <div className="text-sm text-destructive">
        <p>tRPC is not responding{error?.message ? `: ${error.message}` : "."}</p>
        <p className="mt-1 text-xs text-red-200/80">status: {status}, fetchStatus: {fetchStatus}</p>
        {error ? (
          <pre className="mt-1 rounded bg-red-950/40 p-2 text-[11px] text-red-100">
            {JSON.stringify(error, null, 2)}
          </pre>
        ) : null}
        {!error && data === undefined ? (
          <p className="mt-1 text-xs text-red-200/80">No data returned from tRPC response.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      tRPC healthy — {new Date(data.timestamp).toLocaleTimeString()}
    </div>
  );
}
