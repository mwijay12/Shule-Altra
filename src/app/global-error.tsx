"use client"

/**
 * @fileOverview Root error boundary, the last line of defence.
 *
 * Renders its own <html>/<body> because it replaces the root layout when the
 * layout itself fails. Styled with inline values only: no Tailwind, no provider,
 * nothing that could fail twice.
 */

import * as React from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("[shule-altra] root error:", error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "48px 24px",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <main style={{ width: "100%", maxWidth: 460 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 22,
            }}
          >
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg,#1f5ba6,#7c5ae0)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              SA
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Shule Altra
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
            }}
          >
            The system could not start
          </h1>

          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
            No data was written. Reload to fetch the current version of the application.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 22,
              height: 44,
              padding: "0 22px",
              border: 0,
              borderRadius: 999,
              background: "linear-gradient(135deg,#1f5ba6,#7c5ae0)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Reload
          </button>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 22,
              marginLeft: 8,
              height: 44,
              padding: "0 20px",
              borderRadius: 999,
              border: "1px solid #e2e8f0",
              background: "transparent",
              color: "#0f172a",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
