"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  NetworkError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "@/lib/errors";

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry(failureCount, error) {
          if (
            error instanceof ValidationError ||
            error instanceof NotFoundError ||
            error instanceof RateLimitError
          ) {
            return false;
          }
          if (error instanceof NetworkError) return failureCount < 2;
          return failureCount < 1;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
