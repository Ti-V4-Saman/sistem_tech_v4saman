/**
 * @module MetricCard
 * @description Card de indicador para dashboards executivos.
 * Suporta `adminOnly` para exibir um aviso visual quando o usuário não é admin,
 * similar ao comportamento dos itens de menu lateral restritos.
 */
export function MetricCard({ label, value, helper, icon, tone = "neutral", trend, onClick, adminOnly = false, isAdmin = true }) {
  const isRestricted = adminOnly && !isAdmin;

  const cardProps = {
    className: [
      "metric-card",
      `metric-card--${tone}`,
      onClick ? "metric-card--clickable" : "",
      adminOnly ? "metric-card--admin" : "",
      isRestricted ? "metric-card--admin-restricted" : "",
    ].filter(Boolean).join(" "),
    ...(onClick && !isRestricted && { onClick, role: "button", tabIndex: 0 }),
  };

  return (
    <article {...cardProps}>
      <div className="metric-card__topline">
        <span className="metric-card__label">{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {adminOnly && (
            <span
              className="metric-card__admin-badge"
              title="Visível apenas para administradores"
            >
              🔒
            </span>
          )}
          {icon && <span className="metric-card__icon">{icon}</span>}
        </div>
      </div>
      <div className="metric-card__value">
        {isRestricted ? (
          <span style={{ fontSize: "var(--tx-sm)", color: "var(--text-muted)", fontWeight: 400 }}>
            Somente Admin
          </span>
        ) : value}
      </div>
      {!isRestricted && (helper || trend) && (
        <div className="metric-card__footer">
          {helper && <span>{helper}</span>}
          {trend && <strong>{trend}</strong>}
        </div>
      )}
      {isRestricted && (
        <div className="metric-card__footer" style={{ color: "var(--text-muted)", fontSize: "var(--tx-xs)" }}>
          Acesso restrito a administradores
        </div>
      )}
    </article>
  );
}

export default MetricCard;
