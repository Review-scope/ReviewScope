'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 24 }}>
          <h1>Something went wrong</h1>
          <p>{error.message}</p>

          <button onClick={() => reset()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
