import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";
import { Badge, ToolTag } from "../../components/ui/Badge";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ExecutionDash } from "../../components/ui/CustomTooltip";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusPill } from "../../components/ui/StatusPill";
import { sanitizeRichHtml } from "../../utils/security";

function countActive(items = []) {
  return items.filter((item) => item.status === "active" || item.is_active || item.is_published).length;
}

function formatDuration(ms) {
  const value = Number(ms || 0);
  if (!value) return "—";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function getAutomationUrl(automation, execution) {
  const workflowId = automation.externalId || automation.external_id;
  const executionId = execution?.id;
  if (!workflowId || !executionId) return null;
  return `https://n8ops.v4saman.com/workflow/${workflowId}/executions/${executionId}`;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isSuccessStatus(status) {
  return ["success", "succeeded", "ok", "finished"].includes(String(status || "").toLowerCase());
}

function isErrorStatus(status) {
  return ["error", "failed", "failure", "crashed"].includes(String(status || "").toLowerCase());
}

function parseAccesses(notesString) {
  if (!notesString || !notesString.trim()) return [];
  try {
    const parsed = JSON.parse(notesString);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => {
        if (!item || typeof item !== "object") return false;
        if (item.id === "legacy") return false;
        if (item.title && (item.title.includes("Legado") || item.title.includes("Acesso Geral"))) return false;
        return true;
      });
    }
  } catch (e) {
    // plain text system note
  }
  return [];
}

function getExecutionStats(automations = []) {
  return automations.reduce((acc, automation) => {
    const executions = automation.executions || [];
    acc.total += executions.length;
    acc.success += executions.filter((item) => isSuccessStatus(item.status)).length;
    acc.errors += executions.filter((item) => isErrorStatus(item.status)).length;
    return acc;
  }, { total: 0, success: 0, errors: 0 });
}

function IntegrationCard({ label, description, count, active, tone, disabled, selected, onClick }) {
  return (
    <button
      type="button"
      className={`integration-card ${selected ? "integration-card--active" : ""} integration-card--${tone || "neutral"}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="integration-card__dot" />
      <span className="integration-card__body">
        <strong>{label}</strong>
        <small>{description || `${count} ${count === 1 ? "integração" : "integrações"}`}</small>
      </span>
      <span className="integration-card__count">{count}</span>
      {active !== undefined && <span className="integration-card__active">{active}/{count} ativas</span>}
    </button>
  );
}

function ExecutionModal({ automation, onClose }) {
  const [statusFilter, setStatusFilter] = useState("all");
  if (!automation) return null;
  const executions = [...(automation.executions || [])].sort((a, b) => new Date(b.started_at || b.startedAt || 0) - new Date(a.started_at || a.startedAt || 0));
  const successCount = executions.filter((item) => isSuccessStatus(item.status)).length;
  const errorCount = executions.filter((item) => isErrorStatus(item.status)).length;
  const filteredExecutions = executions.filter((execution) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "success") return isSuccessStatus(execution.status);
    if (statusFilter === "error") return isErrorStatus(execution.status);
    return String(execution.status || "").toLowerCase() === statusFilter;
  });

  return (
    <div className="doc-overlay" onClick={onClose}>
      <div className="doc-modal execution-modal" onClick={(event) => event.stopPropagation()}>
        <div className="doc-modal__header">
          <span className="doc-modal__title">Execuções — {automation.name}</span>
          <button className="doc-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="doc-modal__body">
          <div className="execution-summary">
            <div><span>Total</span><strong>{executions.length}</strong></div>
            <div><span>Sucesso</span><strong className="text-success">{successCount}</strong></div>
            <div><span>Erro</span><strong className="text-danger">{errorCount}</strong></div>
            <div><span>Atualizado</span><strong>{automation.updatedAt || "—"}</strong></div>
          </div>

          {executions.length === 0 ? (
            <EmptyState
              icon="🕓"
              title="Sem histórico de execução"
              description="O backend não retornou execuções para esta automação. Quando o sync preencher automation_runs, elas aparecerão aqui."
              compact
            />
          ) : (
            <>
              <div className="execution-toolbar">
                <span>{filteredExecutions.length} de {executions.length} execuções</span>
                <select className="editor-sidebar__select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">Todos os status</option>
                  <option value="success">Somente sucesso</option>
                  <option value="error">Somente erro</option>
                </select>
              </div>
              {filteredExecutions.length === 0 ? (
                <EmptyState icon="🔎" title="Filtro sem resultado" description="Nenhuma execução bate com o status selecionado." compact />
              ) : (
            <div className="table-wrap table-wrap--flat">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Duração</th>
                    <th style={{ textAlign: "right" }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExecutions.map((execution, index) => {
                    const url = getAutomationUrl(automation, execution);
                    return (
                      <tr key={`${execution.id || index}-${execution.startedAt || index}`}>
                        <td><StatusPill status={execution.status} /></td>
                        <td className="muted-cell">{execution.startedAt || execution.started_at || "—"}</td>
                        <td className="muted-cell">{execution.finishedAt || execution.stopped_at || "—"}</td>
                        <td>{formatDuration(execution.durationMs || execution.duration_ms)}</td>
                        <td style={{ textAlign: "right" }}>
                          {url ? (
                            <button className="btn btn--outline btn--sm" onClick={() => window.open(url, "_blank")}>Abrir no n8n</button>
                          ) : (
                            <button className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard?.writeText(String(execution.id || ""))}>Copiar ID</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * @module PageClients
 * @description Página de clientes com listagem, detalhes, integrações e histórico de execuções.
 */
export default function PageClients({ session }) {
  const [q, setQ] = useState("");
  const [tempSearch, setTempSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tempStatus, setTempStatus] = useState("all");
  const [integrationFilter, setIntegrationFilter] = useState("all");
  const [tempIntegration, setTempIntegration] = useState("all");
  const [squadFilter, setSquadFilter] = useState("all");
  const [tempSquad, setTempSquad] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc"); // asc or desc
  const [tempSortBy, setTempSortBy] = useState("name");
  const [showFilters, setShowFilters] = useState(false);
  const [automationQuery, setAutomationQuery] = useState("");
  const [automationStatus, setAutomationStatus] = useState("all");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [selectedTool, setSelectedTool] = useState("n8n");
  const [selectedAutomation, setSelectedAutomation] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", company: "", status: "active" });

  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessesList, setAccessesList] = useState([]);
  const [editingAccess, setEditingAccess] = useState(null);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessTitle, setAccessTitle] = useState("");
  const [accessBody, setAccessBody] = useState("");
  const [savingAccess, setSavingAccess] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState({});
  const clientRequestSeq = useRef(0);

  const isAdmin = session?.user?.accessRoleSlug === "admin" || session?.user?.accessRoleSlug === "super-admin";

  const refreshClients = useCallback(() => {
    let alive = true;
    setLoading(true);
    setLoadError(null);

    api.getClients()
      .then((res) => {
        if (alive) setClients(Array.isArray(res) ? res : []);
      })
      .catch((error) => {
        if (!alive) return;
        setLoadError(error.message || "Erro ao carregar clientes.");
        setClients([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, []);

  useEffect(() => refreshClients(), [refreshClients]);

  useEffect(() => {
    const handleSearch = (e) => {
      if (e.detail) {
        setQ(e.detail);
        setTempSearch(e.detail);
      }
    };
    window.addEventListener("techhub.clientSearch", handleSearch);

    const storedSearch = localStorage.getItem("techhub.clientSearch");
    if (storedSearch) {
      setQ(storedSearch);
      localStorage.removeItem("techhub.clientSearch");
    }
    
    return () => window.removeEventListener("techhub.clientSearch", handleSearch);
  }, []);

  // Removed useEffect that was resetting the access form

  const filtered = useMemo(() => {
    const query = normalizeText(q.trim());
    const list = clients.filter((client) => {
      const matchesQuery = !query || [client.name, client.company, client.legal_name, client.cnpj]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(query));

      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const workflows = Number(client.totalWorkflows || 0);
      const bots = Number(client.totalTypebots || 0);
      const matchesIntegration = integrationFilter === "all"
        || (integrationFilter === "with-n8n" && workflows > 0)
        || (integrationFilter === "without-n8n" && workflows === 0)
        || (integrationFilter === "with-typebot" && bots > 0)
        || (integrationFilter === "without-typebot" && bots === 0);

      const matchesSquad = squadFilter === "all" || client.squad === squadFilter;

      return matchesQuery && matchesStatus && matchesIntegration && matchesSquad;
    });

    return [...list].sort((a, b) => {
      let result = 0;
      if (sortBy === "automations") result = Number(b.totalWorkflows || 0) - Number(a.totalWorkflows || 0);
      else if (sortBy === "bots") result = Number(b.totalTypebots || 0) - Number(a.totalTypebots || 0);
      else if (sortBy === "status") result = String(a.status || "").localeCompare(String(b.status || ""));
      else if (sortBy === "accesses") {
        const accA = a.accessesCount ?? parseAccesses(a.notes).length;
        const accB = b.accessesCount ?? parseAccesses(b.notes).length;
        result = accB - accA;
      }
      else if (sortBy === "updatedAt") {
        const da = new Date(a.updatedAt || a.updated_at || 0);
        const db = new Date(b.updatedAt || b.updated_at || 0);
        result = db.getTime() - da.getTime(); // default is newest first
      }
      else result = String(a.name || "").localeCompare(String(b.name || ""));

      return sortOrder === "desc" ? -result : result;
    });
  }, [q, clients, statusFilter, integrationFilter, squadFilter, sortBy, sortOrder]);

  // Cards always reflect the FILTERED list so they update in real-time with filters
  const summary = useMemo(() => {
    const base = filtered; // use filtered so cards react to search/status/integration filters
    const all = clients;   // keep total clients count for context
    return base.reduce((acc, client) => {
      acc.active += client.status === "active" ? 1 : 0;
      acc.onboarding += client.status === "onboarding" ? 1 : 0;
      acc.automations += Number(client.totalWorkflows || 0);
      acc.bots += Number(client.totalTypebots || 0);
      acc.activeAutomations += Number(client.activeWorkflows || 0);
      acc.activeBots += Number(client.activeTypebots || 0);
      if (Number(client.totalWorkflows || 0) === 0 && Number(client.totalTypebots || 0) === 0) acc.withoutIntegrations += 1;
      return acc;
    }, { active: 0, onboarding: 0, automations: 0, bots: 0, activeAutomations: 0, activeBots: 0, withoutIntegrations: 0, total: all.length });
  }, [filtered, clients]);

  const handleCreate = async () => {
    if (!formData.name.trim()) return alert("O nome do cliente é obrigatório");
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        legalName: formData.company.trim() || null,
        unit: formData.company.trim() || null,
        status: formData.status,
      };
      const newClient = await api.createClient(payload);
      setClients((prev) => [newClient, ...prev]);
      setShowCreateModal(false);
      setFormData({ name: "", company: "", status: "active" });
    } catch (e) {
      alert(e.message || "Erro ao criar cliente.");
    } finally {
      setSaving(false);
    }
  };

  const saveAccessesList = async (newList) => {
    setSavingAccess(true);
    try {
      const notesString = JSON.stringify(newList);
      await api.updateClient(clientDetail.id, { notes: notesString });
      setClientDetail((prev) => ({ ...prev, notes: notesString }));
      setClients((prev) => prev.map((client) => client.id === clientDetail.id ? { ...client, notes: notesString, accessesCount: newList.length } : client));
      setAccessesList(newList);
      setShowAccessForm(false);
      setEditingAccess(null);
    } catch (e) {
      alert(e.message || "Erro ao salvar credenciais.");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleOpenClient = useCallback((id) => {
    const requestId = clientRequestSeq.current + 1;
    clientRequestSeq.current = requestId;
    setSelectedClientId(id);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedTool("n8n");
    setSelectedAutomation(null);

    api.getClientDetails(id)
      .then((res) => {
        if (clientRequestSeq.current !== requestId) return;
        setClientDetail(res);
      })
      .catch((error) => {
        if (clientRequestSeq.current !== requestId) return;
        setDetailError(error.message || "Erro ao carregar detalhes do cliente.");
        setClientDetail(null);
      })
      .finally(() => {
        if (clientRequestSeq.current === requestId) setDetailLoading(false);
      });
  }, []);

  const handleCloseClient = () => {
    clientRequestSeq.current += 1;
    setSelectedClientId(null);
    setClientDetail(null);
    setSelectedAutomation(null);
  };

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "clients") {
        const clientIdToOpen = localStorage.getItem("techhub.openClientId");
        if (!clientIdToOpen) {
          handleCloseClient();
          setQ("");
          setTempSearch("");
          setStatusFilter("all");
          setTempStatus("all");
          setIntegrationFilter("all");
          setTempIntegration("all");
          setSquadFilter("all");
          setTempSquad("all");
          setSortBy("name");
          setSortOrder("asc");
          setTempSortBy("name");
          setShowFilters(false);
        }
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, [handleCloseClient]);

  useEffect(() => {
    const handleSelected = (e) => {
      if (e.detail) handleOpenClient(e.detail);
    };
    window.addEventListener("techhub.clientSelected", handleSelected);

    const clientIdToOpen = localStorage.getItem("techhub.openClientId");
    if (clientIdToOpen) {
      localStorage.removeItem("techhub.openClientId");
      handleOpenClient(clientIdToOpen);
    }
    
    return () => window.removeEventListener("techhub.clientSelected", handleSelected);
  }, [handleOpenClient]);

  if (selectedClientId) {
    if (detailLoading) return <LoadingSpinner />;
    if (detailError) {
      return (
        <EmptyState
          icon="⚠️"
          title="Cliente não carregou"
          description={detailError}
          action={<button className="btn btn--primary" onClick={() => handleOpenClient(selectedClientId)}>Tentar novamente</button>}
        />
      );
    }
    if (!clientDetail) return <EmptyState icon="👤" title="Cliente não encontrado" description="A API não retornou dados para este cliente." />;

    const automations = clientDetail.automations || [];
    const bots = clientDetail.bots || [];
    const instances = clientDetail.instances || [];
    const typebotFolderUrl = bots.find(b => b.folderUrl)?.folderUrl || null;
    const n8nSearchTerm = encodeURIComponent(clientDetail?.name || clientDetail?.company || "");
    const n8nWorkflowsSearchUrl = `https://n8ops.v4saman.com/home/workflows?search=${n8nSearchTerm}`;
    const activeAutomations = countActive(automations);
    const activeBots = countActive(bots);
    const activeInstances = countActive(instances);
    const executionStats = getExecutionStats(automations);
    const automationSearch = normalizeText(automationQuery.trim());
    const filteredAutomations = automations.filter((automation) => {
      const matchesText = !automationSearch || normalizeText(`${automation.name} ${automation.description} ${automation.status}`).includes(automationSearch);
      const matchesStatus = automationStatus === "all" || automation.status === automationStatus || (automationStatus === "error" && (automation.executions || []).some((execution) => isErrorStatus(execution.status)));
      return matchesText && matchesStatus;
    });

    return (
      <div className="client-detail-shell">
        <button 
          className="btn btn--ghost btn--sm" 
          onClick={handleCloseClient}
          style={{ alignSelf: "flex-start", padding: "6px 12px", marginBottom: "12px", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600 }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Voltar para clientes
        </button>

        <section className="client-hero">
          <div>
            <div className="page-header__greeting">Cliente</div>
            <h1 className="client-hero__title">{clientDetail.name}</h1>
            <div className="client-hero__meta">
              {clientDetail.company && <span>{clientDetail.company}</span>}
              <Badge status={clientDetail.status} type="client" />
            </div>
          </div>
          <div className="client-hero__score">
            <span>Automações ativas</span>
            <strong>{activeAutomations}<small>/{automations.length}</small></strong>
          </div>
        </section>

        <section className="client-ops-summary">
          <div><span>Total de integrações</span><strong>{automations.length + bots.length + instances.length}</strong></div>
          <div><span>Execuções registradas</span><strong>{executionStats.total}</strong></div>
          <div><span>Sucessos</span><strong className="text-success">{executionStats.success}</strong></div>
          <div><span>Erros</span><strong className="text-danger">{executionStats.errors}</strong></div>
        </section>

        <section className="integration-grid">
          <IntegrationCard
            label="n8n"
            count={automations.length}
            active={activeAutomations}
            tone="n8n"
            selected={selectedTool === "n8n"}
            disabled={automations.length === 0}
            onClick={() => setSelectedTool("n8n")}
          />
          <IntegrationCard
            label="Typebot"
            count={bots.length}
            active={activeBots}
            tone="typebot"
            selected={selectedTool === "Typebot"}
            disabled={bots.length === 0}
            onClick={() => setSelectedTool("Typebot")}
          />
          <IntegrationCard
            label="v4chat"
            count={instances.length}
            active={activeInstances}
            tone="v4chat"
            selected={selectedTool === "v4chat"}
            disabled={instances.length === 0}
            onClick={() => setSelectedTool("v4chat")}
          />
          <IntegrationCard
            label="Acessos"
            description="Notas e credenciais"
            count={parseAccesses(clientDetail.notes).length}
            tone="access"
            selected={selectedTool === "access"}
            onClick={() => setSelectedTool("access")}
          />
        </section>

        <section className="table-wrap client-integration-table">
          <div className="table-toolbar table-toolbar--split">
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <strong>{selectedTool === "n8n" ? "Automações n8n" : selectedTool === "Typebot" ? "Bots Typebot" : selectedTool === "access" ? "Acessos e Credenciais" : "Instâncias v4chat"}</strong>
              <span>{selectedTool === "n8n" ? `${filteredAutomations.length} de ${automations.length}` : selectedTool === "Typebot" ? `${bots.length} ${bots.length === 1 ? "registro vinculado" : "registros vinculados"}` : selectedTool === "access" ? `${parseAccesses(clientDetail.notes).length} credenciais` : `${instances.length} registros vinculados`}</span>
              {selectedTool === "n8n" && (
                <button 
                  className="btn btn--outline btn--sm" 
                  onClick={() => window.open(n8nWorkflowsSearchUrl, "_blank")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", marginLeft: 4 }}
                  title="Abrir busca de fluxos no n8n"
                >
                  Ir para fluxos no n8n
                </button>
              )}
              {selectedTool === "Typebot" && typebotFolderUrl && (
                <button 
                  className="btn btn--outline btn--sm" 
                  onClick={() => window.open(typebotFolderUrl, "_blank")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", marginLeft: 4 }}
                  title="Abrir pasta de bots no Typebot Builder"
                >
                  Ir para pasta de bots
                </button>
              )}
            </div>
            {selectedTool === "n8n" && automations.length > 0 && (
              <div className="toolbar-actions toolbar-actions--compact">
                <input className="search-input search-input--sm" placeholder="Filtrar automações..." value={automationQuery} onChange={(event) => setAutomationQuery(event.target.value)} />
                <select className="editor-sidebar__select select--sm" value={automationStatus} onChange={(event) => setAutomationStatus(event.target.value)}>
                  <option value="all">Todos</option>
                  <option value="active">Ativas</option>
                  <option value="inactive">Inativas</option>
                  <option value="error">Com erro</option>
                </select>
              </div>
            )}
          </div>

          {selectedTool === "n8n" && (
            automations.length === 0 ? (
              <EmptyState icon="⚡" title="Nenhuma automação n8n" description="Este cliente ainda não possui workflows vinculados no banco." compact />
            ) : filteredAutomations.length === 0 ? (
              <EmptyState icon="🔎" title="Filtro sem resultado" description="Nenhuma automação corresponde ao filtro aplicado." compact />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Automação</th>
                    <th>Status</th>
                    <th>Execuções</th>
                    <th>Última atualização</th>
                    <th style={{ textAlign: "right" }}>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAutomations.map((automation) => (
                    <tr key={automation.id} className="clickable-row" onClick={() => setSelectedAutomation(automation)}>
                      <td>
                        <div className="table-title">{automation.name}</div>
                        {automation.description && <div className="table-subtitle">{automation.description}</div>}
                      </td>
                      <td><Badge status={automation.status} type="auto" /></td>
                      <td><ExecutionDash executions={automation.executions} workflowId={automation.externalId || automation.external_id || automation.id} /></td>
                      <td className="muted-cell">{automation.updatedAt || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          {automation.workflowUrl && (
                            <button 
                              className="btn btn--primary btn--sm" 
                              onClick={(event) => { event.stopPropagation(); window.open(automation.workflowUrl, "_blank"); }}
                              title="Abrir e editar fluxo no n8n"
                            >
                              Editar no n8n
                            </button>
                          )}
                          <button 
                            className="btn btn--outline btn--sm" 
                            onClick={(event) => { event.stopPropagation(); setSelectedAutomation(automation); }}
                            title="Ver histórico de execuções"
                          >
                            Ver execuções
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {selectedTool === "Typebot" && (
            bots.length === 0 ? (
              <EmptyState icon="🤖" title="Nenhum Typebot" description="Nenhum bot Typebot está vinculado a este cliente." compact />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Bot</th>
                    <th>Status</th>
                    <th>ID público</th>
                    <th>Última atualização</th>
                    <th style={{ textAlign: "right" }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {bots.map((bot) => (
                    <tr 
                      key={bot.id} 
                      className={bot.editorUrl ? "clickable-row" : ""} 
                      onClick={() => bot.editorUrl && window.open(bot.editorUrl, "_blank")}
                    >
                      <td>
                        <div className="table-title">{bot.name}</div>
                        {bot.folderName && <div className="table-subtitle">Pasta: {bot.folderName}</div>}
                      </td>
                      <td><Badge status={bot.status} type="client" /></td>
                      <td className="muted-cell">{bot.public_id || bot.externalId || "—"}</td>
                      <td className="muted-cell">{bot.updatedAt || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          {bot.editorUrl && (
                            <button 
                              className="btn btn--primary btn--sm" 
                              onClick={(event) => { event.stopPropagation(); window.open(bot.editorUrl, "_blank"); }}
                              title="Editar fluxo no Typebot Builder"
                            >
                              Editar no Typebot
                            </button>
                          )}
                          {bot.url && (
                            <button 
                              className="btn btn--outline btn--sm" 
                              onClick={(event) => { event.stopPropagation(); window.open(bot.url, "_blank"); }}
                              title="Abrir chat público"
                            >
                              Abrir chat
                            </button>
                          )}
                          {!bot.editorUrl && !bot.url && <span className="muted-cell">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {selectedTool === "v4chat" && (
            instances.length === 0 ? (
              <EmptyState icon="💬" title="Nenhuma instância v4chat" description="Nenhuma instância está vinculada a este cliente." compact />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Instância</th>
                    <th>Número / Identificador</th>
                    <th>Provedor</th>
                    <th>Status</th>
                    <th>Última conexão</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => (
                    <tr key={instance.id}>
                      <td>
                        <div className="table-title">{instance.name}</div>
                        {instance.notes && <div className="table-subtitle">{instance.notes}</div>}
                      </td>
                      <td className="muted-cell">{instance.identifier || instance.phone || "—"}</td>
                      <td><ToolTag tool={instance.provider || instance.tool} /></td>
                      <td><Badge status={instance.status} type="client" /></td>
                      <td className="muted-cell">{instance.lastConnectedAt || instance.updatedAt || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {selectedTool === "access" && (
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span>Gerencie senhas, links e notas do cliente.</span>
                {isAdmin && (
                  <button 
                    className="btn btn--primary btn--sm" 
                    onClick={() => {
                      setEditingAccess(null);
                      setAccessTitle("");
                      setAccessBody("");
                      setAccessesList(parseAccesses(clientDetail.notes));
                      setShowAccessForm(true);
                      setShowAccessModal(true);
                    }}
                  >
                    + Nova credencial
                  </button>
                )}
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {parseAccesses(clientDetail.notes).length === 0 ? (
                  <EmptyState icon="🔒" title="Sem acessos" description="Nenhuma credencial cadastrada para este cliente." compact />
                ) : (
                  parseAccesses(clientDetail.notes).map((item) => {
                    const hasHtml = /<[a-z][\s\S]*>/i.test(item.body || "");
                    const isCopied = copyFeedback[item.id] === 'body';
                    const isLinkCopied = copyFeedback[item.id] === 'link';
                    
                    return (
                      <div key={item.id} style={{ background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border)", overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.02)" }}>
                          <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{item.title}</strong>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button 
                              className={`btn btn--sm ${isLinkCopied ? 'btn--primary' : 'btn--outline'}`}
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                              onClick={() => {
                                // Extract first URL if possible for the link
                                const urlMatch = (item.body || "").match(/https?:\/\/[^\s]+/);
                                const textToCopy = urlMatch ? urlMatch[0] : item.body;
                                navigator.clipboard?.writeText(textToCopy);
                                setCopyFeedback({ [item.id]: 'link' });
                                setTimeout(() => setCopyFeedback({}), 2000);
                              }}
                              title="Copia o primeiro link encontrado ou o conteúdo"
                            >
                              {isLinkCopied ? "✓ Link" : "🔗 Copiar Link"}
                            </button>
                            <button 
                              className={`btn btn--sm ${isCopied ? 'btn--primary' : 'btn--outline'}`}
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                              onClick={() => {
                                navigator.clipboard?.writeText(item.body || "");
                                setCopyFeedback({ [item.id]: 'body' });
                                setTimeout(() => setCopyFeedback({}), 2000);
                              }}
                            >
                              {isCopied ? "✓ Acesso" : "📋 Copiar Acesso"}
                            </button>
                            {isAdmin && (
                              <>
                                <button 
                                  className="btn btn--ghost btn--sm" 
                                  style={{ padding: "4px 8px", fontSize: "12px" }}
                                  onClick={() => {
                                    setEditingAccess(item);
                                    setAccessTitle(item.title);
                                    setAccessBody(item.body);
                                    setAccessesList(parseAccesses(clientDetail.notes));
                                    setShowAccessForm(true);
                                    setShowAccessModal(true);
                                  }}
                                >
                                  ✏️ Editar
                                </button>
                                <button 
                                  className="btn btn--ghost btn--sm text-danger" 
                                  style={{ padding: "4px 8px", fontSize: "12px" }}
                                  onClick={() => {
                                    if (confirm(`Tem certeza que deseja excluir "${item.title}"?`)) {
                                      const nextList = parseAccesses(clientDetail.notes).filter(x => x.id !== item.id);
                                      saveAccessesList(nextList);
                                    }
                                  }}
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ padding: "16px", fontSize: "15px", fontFamily: "monospace", color: "var(--text-primary)", whiteSpace: hasHtml ? "normal" : "pre-wrap", overflowX: "auto" }}>
                          {hasHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(item.body) }} />
                          ) : (
                            item.body || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sem conteúdo</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>

        {selectedAutomation && <ExecutionModal automation={selectedAutomation} onClose={() => setSelectedAutomation(null)} />}

        {showAccessModal && (
          <div className="doc-overlay" onClick={() => setShowAccessModal(false)}>
            <div className="doc-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 720, width: "100%" }}>
              <div className="doc-modal__header">
                <span className="doc-modal__title">Acessos — {clientDetail.name}</span>
                <button className="doc-modal__close" onClick={() => setShowAccessModal(false)}>✕</button>
              </div>
              <div className="doc-modal__body">
                {showAccessForm ? (
                  <div className="form-grid" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>
                      {editingAccess ? "Editar credencial" : "Nova credencial"}
                    </h3>
                    <label>
                      <span className="editor-sidebar__label">Título / Serviço</span>
                      <input 
                        className="editor-sidebar__input" 
                        value={accessTitle} 
                        onChange={(event) => setAccessTitle(event.target.value)} 
                        placeholder="Ex: Painel Admin, Shopify API" 
                      />
                    </label>
                    <label>
                      <span className="editor-sidebar__label">Credenciais / Detalhes</span>
                      <textarea 
                        className="editor-sidebar__input" 
                        value={accessBody} 
                        onChange={(event) => setAccessBody(event.target.value)} 
                        placeholder="Insira senhas, tokens, links ou anotações..."
                        rows={8}
                        style={{ fontFamily: "monospace", fontSize: "15px", resize: "vertical" }}
                      />
                    </label>
                    <div className="modal-actions" style={{ marginTop: "16px" }}>
                      <button className="btn btn--ghost" onClick={() => setShowAccessForm(false)} disabled={savingAccess}>
                        Cancelar
                      </button>
                      <button 
                        className="btn btn--primary" 
                        onClick={() => {
                          if (!accessTitle.trim()) return alert("O título é obrigatório");
                          let nextList;
                          if (editingAccess) {
                            nextList = accessesList.map(x => x.id === editingAccess.id ? { ...x, title: accessTitle.trim(), body: accessBody } : x);
                          } else {
                            nextList = [...accessesList, { id: String(Date.now()), title: accessTitle.trim(), body: accessBody }];
                          }
                          saveAccessesList(nextList);
                        }} 
                        disabled={savingAccess}
                      >
                        {savingAccess ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="clients-shell">
      <div className="page-header page-header--split">
        <div>
          <div className="page-header__greeting">Database</div>
          <div className="page-header__title">Clientes</div>
          <div className="page-header__subtitle">
            {loading ? "Carregando clientes..." : `${filtered.length} de ${clients.length} cliente${clients.length !== 1 ? "s" : ""} no banco`}
          </div>
        </div>
      </div>

      {!loading && clients.length > 0 && (
        <section className="metric-grid" style={{ marginBottom: '24px' }}>
          {/* Card 1: Clientes ativos */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "var(--sh-xs)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(233, 46, 48, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary)",
              flexShrink: 0
            }}>
              <Icons.Users />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <strong style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1 }}>
                {summary.active}
              </strong>
              <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)" }}>
                Clientes ativos
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", opacity: 0.8 }}>
                de {filtered.length} exibidos{filtered.length !== clients.length ? ` (${clients.length} total)` : ''}
              </span>
            </div>
          </div>

          {/* Card 2: Automações ativas */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "var(--sh-xs)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(233, 46, 48, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary)",
              flexShrink: 0
            }}>
              <Icons.Zap />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <strong style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1 }}>
                {summary.activeAutomations}
              </strong>
              <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)" }}>
                Automações ativas
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", opacity: 0.8 }}>
                de {summary.automations} cadastradas
              </span>
            </div>
          </div>

          {/* Card 3: Typebots ativos */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "var(--sh-xs)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(233, 46, 48, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary)",
              flexShrink: 0
            }}>
              <Icons.Bot />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <strong style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1 }}>
                {summary.activeBots}
              </strong>
              <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)" }}>
                Typebots ativos
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", opacity: 0.8 }}>
                de {summary.bots} cadastrados
              </span>
            </div>
          </div>
        </section>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: '1 1 200px', minWidth: '160px', maxWidth: '320px' }}>
            <span className="si"><Icons.Search /></span>
            <input 
              className="search-input" 
              placeholder="Buscar cliente..." 
              value={tempSearch} 
              onChange={(event) => setTempSearch(event.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') setQ(tempSearch); }}
            />
          </div>
          
          <button 
            type="button" 
            className="btn btn--primary btn--sm"
            onClick={() => setQ(tempSearch)}
            style={{ gap: '6px' }}
          >
            Pesquisar
          </button>

          <button 
            type="button" 
            className={`btn ${showFilters ? 'btn--primary' : 'btn--outline'} btn--sm`} 
            onClick={() => setShowFilters(!showFilters)}
            style={{ gap: '6px' }}
          >
            Filtros Avançados
          </button>
        </div>

        {showFilters && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            marginTop: '4px', 
            padding: '16px', 
            background: 'var(--bg-secondary)', 
            borderRadius: '12px', 
            border: '1px solid var(--border)' 
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="editor-sidebar__select select--sm"
                value={tempStatus}
                onChange={(e) => setTempStatus(e.target.value)}
                style={{ minWidth: '140px', flex: '1 1 150px' }}
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
              <select
                className="editor-sidebar__select select--sm"
                value={tempIntegration}
                onChange={(e) => setTempIntegration(e.target.value)}
                style={{ minWidth: '160px', flex: '1 1 150px' }}
              >
                <option value="all">Todas as integrações</option>
                <option value="with-n8n">Com Automação</option>
                <option value="without-n8n">Sem Automação</option>
                <option value="with-typebot">Com Bots</option>
                <option value="without-typebot">Sem Bots</option>
              </select>
              <select
                className="editor-sidebar__select select--sm"
                value={tempSquad}
                onChange={(e) => setTempSquad(e.target.value)}
                style={{ minWidth: '140px', flex: '1 1 150px' }}
              >
                <option value="all">Todos os Squads</option>
                {Array.from(new Set(clients.map(c => c.squad).filter(Boolean))).map(squad => (
                  <option key={squad} value={squad}>{squad}</option>
                ))}
              </select>
              <select
                className="editor-sidebar__select select--sm"
                value={tempSortBy}
                onChange={(e) => setTempSortBy(e.target.value)}
                style={{ minWidth: '140px', flex: '1 1 150px' }}
              >
                <option value="name">Ordenar: Nome</option>
                <option value="automations">Mais automações</option>
                <option value="bots">Mais bots</option>
                <option value="status">Por status</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
              <button 
                type="button" 
                className="btn btn--outline btn--sm text-danger" 
                onClick={() => {
                  setTempSearch("");
                  setQ("");
                  setTempStatus("all");
                  setStatusFilter("all");
                  setTempIntegration("all");
                  setIntegrationFilter("all");
                  setTempSquad("all");
                  setSquadFilter("all");
                  setTempSortBy("name");
                  setSortBy("name");
                  setSortOrder("asc");
                }}
                style={{ gap: '6px', color: 'var(--danger)', borderColor: 'rgba(233,46,48,0.15)' }}
              >
                Limpar Filtros
              </button>
              <button 
                type="button" 
                className="btn btn--primary btn--sm" 
                onClick={() => {
                  setQ(tempSearch);
                  setStatusFilter(tempStatus);
                  setIntegrationFilter(tempIntegration);
                  setSquadFilter(tempSquad);
                  setSortBy(tempSortBy);
                }}
              >
                Filtrar
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? <LoadingSpinner /> : loadError ? (
        <EmptyState icon="⚠️" title="Erro ao carregar clientes" description={loadError} action={<button className="btn btn--primary" onClick={refreshClients}>Tentar novamente</button>} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Nenhum cliente cadastrado"
          description="A tabela de clientes está vazia ou a API não retornou registros. Crie clientes manualmente ou rode o sync/importação existente."
          action={isAdmin ? <button className="btn btn--primary" onClick={() => setShowCreateModal(true)}>Criar primeiro cliente</button> : null}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔎" title="Busca sem resultado" description="Nenhum cliente corresponde ao termo pesquisado." compact />
      ) : (
        <div className="table-wrap" style={{ borderTop: "3px solid var(--color-primary)" }}>
          <table className="table">
            <thead>
              <tr>
                <th 
                  onClick={() => {
                    if (sortBy === "name") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("name");
                      setSortOrder("asc");
                    }
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Ordenar por Nome"
                >
                  Nome {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => {
                    if (sortBy === "status") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("status");
                      setSortOrder("asc");
                    }
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Ordenar por Status"
                >
                  Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  onClick={() => {
                    if (sortBy === "automations") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("automations");
                      setSortOrder("asc");
                    }
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Ordenar por Automações"
                >
                  Automações {sortBy === "automations" && (sortOrder === "asc" ? "↓" : "↑")}
                </th>
                <th 
                  onClick={() => {
                    if (sortBy === "bots") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("bots");
                      setSortOrder("asc");
                    }
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Ordenar por Bots"
                >
                  Bots {sortBy === "bots" && (sortOrder === "asc" ? "↓" : "↑")}
                </th>
                <th 
                  onClick={() => {
                    if (sortBy === "accesses") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("accesses");
                      setSortOrder("asc");
                    }
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Ordenar por Acessos"
                >
                  Acessos {sortBy === "accesses" && (sortOrder === "asc" ? "↓" : "↑")}
                </th>
                <th 
                  onClick={() => {
                    if (sortBy === "updatedAt") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("updatedAt");
                      setSortOrder("asc"); // asc here means newest first since we used db.getTime() - da.getTime()
                    }
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Ordenar por Atualização"
                >
                  Atualização {sortBy === "updatedAt" && (sortOrder === "asc" ? "↓" : "↑")}
                </th>
                <th style={{ textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="clickable-row" onClick={() => handleOpenClient(client.id)}>
                  <td>
                    <div className="table-title">{client.name}</div>
                    <div className="table-subtitle">{client.company || client.legal_name || ""}</div>
                  </td>
                  <td><Badge status={client.status} type="client" /></td>
                  <td>
                    <strong>{client.activeWorkflows || 0}</strong>
                    <span className="muted-cell"> / {client.totalWorkflows || 0}</span>
                  </td>
                  <td>
                    <strong>{client.activeTypebots || 0}</strong>
                    <span className="muted-cell"> / {client.totalTypebots || 0}</span>
                  </td>
                  <td><strong>{client.accessesCount ?? parseAccesses(client.notes).length}</strong></td>
                  <td className="muted-cell">{client.updatedAt || client.updated_at ? new Date(client.updatedAt || client.updated_at).toLocaleDateString() : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button 
                      className="btn btn--outline" 
                      onClick={(event) => { event.stopPropagation(); handleOpenClient(client.id); }}
                    >
                      Acessar →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="doc-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="doc-modal" onClick={(event) => event.stopPropagation()}>
            <div className="doc-modal__header">
              <span className="doc-modal__title">Novo Cliente</span>
              <button className="doc-modal__close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="doc-modal__body">
              <div className="form-grid">
                <label>
                  <span className="editor-sidebar__label">Nome do cliente *</span>
                  <input className="editor-sidebar__input" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder="Ex: Acme Corp" />
                </label>
                <label>
                  <span className="editor-sidebar__label">Nome fantasia / unidade</span>
                  <input className="editor-sidebar__input" value={formData.company} onChange={(event) => setFormData({ ...formData, company: event.target.value })} placeholder="Ex: Matriz SP" />
                </label>
                <label>
                  <span className="editor-sidebar__label">Status</span>
                  <select className="editor-sidebar__select" value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })}>
                    <option value="active">Ativo</option>
                    <option value="onboarding">Implantação</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn btn--ghost" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button className="btn btn--primary" onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Criar cliente"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
