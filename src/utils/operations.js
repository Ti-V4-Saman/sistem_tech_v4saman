/**
 * Utilitários de operação interna.
 * Mantém regras de leitura/triagem no frontend sem alterar banco ou APIs existentes.
 */
export function toNumber(value) {
  return Number(value || 0);
}



export function getDailyChecklist() {
  return [
    "Conferir alertas críticos do dashboard",
    "Abrir automações com erro e validar últimas execuções",
    "Revisar clientes em risco ou sem integrações ativas",
    "Registrar correções importantes na Base de Conhecimento",
    "Confirmar se novos clientes foram sincronizados/importados",
  ];
}
