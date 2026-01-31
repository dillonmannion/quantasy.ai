'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-4xl font-bold text-red-400">Oops!</h1>
        <p className="mb-6 text-lg text-slate-300">
          Something went wrong. Our team has been notified.
        </p>
        <p className="mb-8 text-sm text-slate-400">
          Error ID: {error.digest || 'unknown'}
        </p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
