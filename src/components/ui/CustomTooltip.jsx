/**
 * @module CustomTooltip
 * @description Tooltip personalizado para os gráficos Recharts.
 */

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "var(--sh-md)",
      }}
    >
      {label && (
        <p style={{ color: "var(--text-muted)", marginBottom: 6 }}>{label}</p>
      )}
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            color: p.color || "var(--text-primary)",
            fontWeight: 600,
            margin: "2px 0",
          }}
        >
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/**
 * Indicador visual de execuções recentes (mini barras de status).
 */
export function ExecutionDash({ executions, workflowId }) {
  if (!executions || executions.length === 0)
    return (
      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
        Sem histórico
      </span>
    );

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {executions.map((exec) => {
        const isError = exec.status === "error";
        const isSuccess = exec.status === "success";
        const color = isError
          ? "var(--danger)"
          : isSuccess
          ? "var(--success)"
          : "var(--warning)";

        return (
          <div
            key={exec.id}
            title={
              isError
                ? "Falha - Clique para abrir no n8n"
                : `Status: ${exec.status}`
            }
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: color,
              cursor: isError ? "pointer" : "default",
              opacity: 0.8,
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseOut={(e) => (e.currentTarget.style.opacity = 0.8)}
            onClick={() => {
              if (isError) {
                window.open(
                  `https://n8ops.v4saman.com/workflow/${workflowId}/executions/${exec.id}`,
                  "_blank"
                );
              }
            }}
          />
        );
      })}
    </div>
  );
}

export default CustomTooltip;
