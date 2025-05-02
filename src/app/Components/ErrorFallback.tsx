"use client";

export default function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        margin: "2rem",
        padding: "2rem",
        backgroundColor: "#FEF2F2",
        borderRadius: "0.5rem",
        color: "#991B1B",
      }}
    >
      <h2>Something went wrong:</h2>
      <pre
        style={{
          overflow: "auto",
          padding: "1rem",
          backgroundColor: "#FEF2F2",
        }}
      >
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#2563EB",
          color: "white",
          borderRadius: "0.25rem",
          border: "none",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
