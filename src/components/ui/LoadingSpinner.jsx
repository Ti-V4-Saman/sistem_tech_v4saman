/**
 * @module LoadingSpinner
 * @description Spinner centralizado para estados de carregamento.
 */

export function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: "spin 1s linear infinite",
          color: "var(--color-primary)",
        }}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  );
}

export default LoadingSpinner;
