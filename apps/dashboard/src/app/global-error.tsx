'use client';

import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 text-center">
        <div className="space-y-6 max-w-md">
          <div className="p-4 bg-red-100 rounded-2xl w-fit mx-auto">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-black tracking-tight italic uppercase">System Failure</h1>
          <p className="text-muted-foreground font-medium">
            An unexpected error occurred in the intelligence dashboard.
          </p>
          <div className="p-4 bg-zinc-100 rounded-xl font-mono text-[10px] text-zinc-500 break-all">
            {error.message || 'Unknown Error'} {error.digest && `(Digest: ${error.digest})`}
          </div>
          <button
            onClick={() => reset()}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest hover:shadow-lg transition-all"
          >
            Re-initialize Dashboard
          </button>
        </div>
      </body>
    </html>
  );
}
