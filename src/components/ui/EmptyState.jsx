/**
 * @module EmptyState
 * @description Estado vazio reutilizável para tabelas, cards e páginas.
 */
export function EmptyState({
  icon = "◎",
  title = "Nenhum dado encontrado",
  description = "Quando houver informações disponíveis, elas aparecerão aqui.",
  action = null,
  compact = false,
}) {
  return (
    <div className={`empty-state ${compact ? "empty-state--compact" : ""}`}>
      <div className="empty-state__icon">{icon}</div>
      <div className="empty-state__title">{title}</div>
      <div className="empty-state__description">{description}</div>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export default EmptyState;
