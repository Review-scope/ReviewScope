'use client'

export default function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Not Found</h2>
      <p>Could not find requested resource</p>

      <a
        href="/"
        style={{
          padding: '8px 16px',
          backgroundColor: '#000',
          color: '#fff',
          borderRadius: '4px',
          textDecoration: 'none',
          display: 'inline-block',
          marginTop: 12,
        }}
      >
        Return Home
      </a>
    </div>
  )
}
