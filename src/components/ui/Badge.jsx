/**
 * @module Badge
 * @description Badge de status com cores semânticas.
 */

export function Badge({ status, type = "client" }) {
  const map = {
    client: {
      active: { label: "Ativo", cls: "badge--success" },
      onboarding: { label: "Implantação", cls: "badge--warning" },
      maintenance: { label: "Manutenção", cls: "badge--warning" },
      inactive: { label: "Inativo", cls: "badge--default" },
    },
    auto: {
      active: { label: "Ativa", cls: "badge--success" },
      error: { label: "Erro", cls: "badge--danger" },
      maintenance: { label: "Manutenção", cls: "badge--warning" },
      development: { label: "Em dev", cls: "badge--default" },
      inactive: { label: "Inativa", cls: "badge--default" },
    },
  };
  const c = map[type]?.[status] || { label: status, cls: "badge--default" };
  return <span className={`badge ${c.cls}`}>{c.label}</span>;
}

export function ToolTag({ tool }) {
  return (
    <span
      className="badge badge--default"
      style={{
        background: "var(--bg-secondary)",
        color: "var(--text-secondary)",
      }}
    >
      {tool || "—"}
    </span>
  );
}

export default Badge;
