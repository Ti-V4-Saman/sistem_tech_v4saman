const STATUS_LABELS = {
  success: "Sucesso",
  succeeded: "Sucesso",
  ok: "Sucesso",
  error: "Erro",
  failed: "Falha",
  failure: "Falha",
  running: "Executando",
  waiting: "Aguardando",
  active: "Ativa",
  inactive: "Inativa",
};

const STATUS_TONES = {
  success: "success",
  succeeded: "success",
  ok: "success",
  error: "danger",
  failed: "danger",
  failure: "danger",
  running: "info",
  waiting: "warning",
  active: "success",
  inactive: "default",
};

/**
 * @module StatusPill
 * @description Badge semântico e consistente para status técnicos.
 */
export function StatusPill({ status, label }) {
  const key = String(status || "default").toLowerCase();
  const tone = STATUS_TONES[key] || "default";
  return <span className={`badge badge--${tone}`}>{label || STATUS_LABELS[key] || status || "—"}</span>;
}

export default StatusPill;
