import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { api } from "../../services/api";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusPill } from "../../components/ui/StatusPill";
import { MetricCard } from "../../components/ui/MetricCard";
import { formatDateTime } from "../../utils/formatters";
import { Icons } from "../../icons/Icons";

export default function PageAlerts({ permissions = [] }) {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState("active"); // active, history
  
  // Filtros
  const [search, setSearch] = useState("");
  const [tempSearch, setTempSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [tempUrgency, setTempUrgency] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [tempSortBy, setTempSortBy] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);

  // Modal de confirmação de resolução
  const [alertToResolve, setAlertToResolve] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolving, setResolving] = useState(false);

  // Dropdown de erros expandidos por alerta
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [alertEvents, setAlertEvents] = useState({});
  const [loadingEvents, setLoadingEvents] = useState({});

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "alerts") {
        setActiveTab("active");
        setSearch("");
        setTempSearch("");
        setUrgencyFilter("all");
        setTempUrgency("all");
        setSortBy("recent");
        setTempSortBy("recent");
        setShowFilters(false);
        setAlertToResolve(null);
        setExpandedAlertId(null);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const canManage = permissions.includes("alerts.manage") || permissions.includes("*");

  const getUrgencyWeight = (urgency) => {
    switch (urgency) {
      case "urgent": return 4;
      case "high": return 3;
      case "medium": return 2;
      case "low": return 1;
      default: return 0;
    }
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case "urgent": return <span className="badge badge--danger" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>URGENTE</span>; // Red
      case "high": return <span className="badge" style={{ backgroundColor: "#eab308", color: "white", fontWeight: 600 }}>Alta</span>; // Yellow
      case "medium": return <span className="badge badge--success" style={{ fontWeight: 600 }}>Média</span>; // Green
      case "low": return <span className="badge" style={{ backgroundColor: "#3b82f6", color: "white", fontWeight: 600 }}>Baixa</span>; // Blue
      default: return null;
    }
  };

  const processedAlerts = useMemo(() => {
    let result = [...alerts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        a => (a.client || "").toLowerCase().includes(q) || (a.title || "").toLowerCase().includes(q)
      );
    }

    if (urgencyFilter !== "all") {
      result = result.filter(a => a.urgency === urgencyFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.occurred_at) - new Date(a.occurred_at);
      }
      if (sortBy === "oldest") {
        return new Date(a.occurred_at) - new Date(b.occurred_at);
      }
      if (sortBy === "errors_desc") {
        return b.occurrence_count - a.occurrence_count;
      }
      if (sortBy === "errors_asc") {
        return a.occurrence_count - b.occurrence_count;
      }
      if (sortBy === "urgency_desc") {
        return getUrgencyWeight(b.urgency) - getUrgencyWeight(a.urgency);
      }
      return 0;
    });

    return result;
  }, [alerts, search, urgencyFilter, sortBy]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts();
      setAlerts(res.data || []);

      if (activeTab === "history") {
        const resHist = await api.getAlertsHistory();
        setHistory(resHist.data || []);
      }
      setError(null);
    } catch (err) {
      setError(err.message || "Erro ao carregar alertas.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const urgencyCounts = useMemo(() => {
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
    let list = alerts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        a => (a.client || "").toLowerCase().includes(q) || (a.title || "").toLowerCase().includes(q)
      );
    }
    list.forEach(a => {
      if (counts[a.urgency] !== undefined) {
        counts[a.urgency]++;
      }
    });
    return counts;
  }, [alerts, search]);

  const toggleExpandAlert = async (alert) => {
    if (expandedAlertId === alert.id) {
      setExpandedAlertId(null);
      return;
    }

    setExpandedAlertId(alert.id);

    if (!alertEvents[alert.id]) {
      setLoadingEvents(prev => ({ ...prev, [alert.id]: true }));
      try {
        const events = await api.getAlertEvents(alert.id);
        if (Array.isArray(events) && events.length > 0) {
          setAlertEvents(prev => ({ ...prev, [alert.id]: events }));
        } else {
          const count = Number(alert.occurrence_count || 1);
          const fallbackEvents = Array.from({ length: count }).map((_, idx) => ({
            id: `${alert.id}-event-${idx}`,
            error_message: alert.message || alert.title || "Falha na execução da automação",
            occurred_at: alert.occurred_at,
            automation_run_id: `EXEC-#${count - idx}`,
            external_run_id: alert.automation_url
          }));
          setAlertEvents(prev => ({ ...prev, [alert.id]: fallbackEvents }));
        }
      } catch (err) {
        console.error("Erro ao carregar lista de erros:", err);
        const count = Number(alert.occurrence_count || 1);
        const fallbackEvents = Array.from({ length: count }).map((_, idx) => ({
          id: `${alert.id}-event-${idx}`,
          error_message: alert.message || alert.title || "Falha na execução da automação",
          occurred_at: alert.occurred_at,
          automation_run_id: `EXEC-#${count - idx}`,
          external_run_id: alert.automation_url
        }));
        setAlertEvents(prev => ({ ...prev, [alert.id]: fallbackEvents }));
      } finally {
        setLoadingEvents(prev => ({ ...prev, [alert.id]: false }));
      }
    }
  };

  const confirmResolveAlert = async () => {
    if (!alertToResolve) return;
    setResolving(true);
    try {
      await api.resolveAlert(alertToResolve.id, resolutionNote.trim() || "Resolvido via painel de alertas");
      setAlertToResolve(null);
      setResolutionNote("");
      loadData();
    } catch (err) {
      alert(err.message || "Erro ao resolver alerta.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="page-layout">
      <SectionHeader
        title="Alertas Operacionais"
        description="Acompanhamento de falhas em automações e integrações que exigem intervenção manual."
        right={
          <div className="alert-tabs">
            <button 
              type="button"
              className={`alert-tab ${activeTab === 'active' ? 'alert-tab--active' : ''}`}
              onClick={() => setActiveTab("active")}
            >
              Ativos ({alerts.length})
            </button>
            <button 
              type="button"
              className={`alert-tab ${activeTab === 'history' ? 'alert-tab--active' : ''}`}
              onClick={() => setActiveTab("history")}
            >
              Histórico
            </button>
          </div>
        }
      />

      {activeTab === "active" && !loading && !error && (
        <section className="metric-grid mb-6" style={{ marginBottom: '24px' }}>
          <MetricCard label="Urgente" value={urgencyCounts.urgent} tone="danger" icon={<Icons.AlertTriangle />} />
          <MetricCard label="Alta" value={urgencyCounts.high} tone="warning" icon={<Icons.Shield />} />
          <MetricCard label="Média" value={urgencyCounts.medium} tone="success" icon={<Icons.CheckCircle />} />
          <MetricCard label="Baixa" value={urgencyCounts.low} tone="info" icon={<Icons.HelpCircle />} />
        </section>
      )}

      {/* Filtros Toolbar Premium */}
      {!loading && !error && activeTab === "active" && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: '200px', maxWidth: '300px' }}>
            <span className="si" style={{ paddingLeft: 12 }}>🔍</span>
            <input
              type="text"
              placeholder="Pesquisar por cliente..."
              className="search-input"
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSearch(tempSearch); }}
              style={{ width: "100%", paddingLeft: 36 }}
            />
          </div>
          
          <button 
            type="button" 
            className="btn btn--primary btn--sm" 
            onClick={() => setSearch(tempSearch)}
          >
            Pesquisar
          </button>

          <button 
            type="button" 
            className={`btn ${showFilters ? 'btn--primary' : 'btn--outline'} btn--sm`} 
            onClick={() => setShowFilters(!showFilters)}
            style={{ whiteSpace: 'nowrap' }}
          >
            Filtros Avançados {showFilters ? '▲' : '▼'}
          </button>

          {showFilters && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', animation: 'floatUpFilters 0.2s ease-out' }}>
              <select
                className="editor-sidebar__select select--sm"
                value={tempUrgency}
                onChange={(e) => setTempUrgency(e.target.value)}
                style={{ minWidth: '140px' }}
              >
                <option value="all">Todas as Urgências</option>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
              <select
                className="editor-sidebar__select select--sm"
                value={tempSortBy}
                onChange={(e) => setTempSortBy(e.target.value)}
                style={{ minWidth: '140px' }}
              >
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="errors_desc">Mais erros</option>
                <option value="errors_asc">Menos erros</option>
                <option value="urgency_desc">Mais urgentes</option>
              </select>
              <button 
                type="button" 
                className="btn btn--outline btn--sm text-danger" 
                onClick={() => {
                  setTempSearch("");
                  setSearch("");
                  setTempUrgency("all");
                  setUrgencyFilter("all");
                  setTempSortBy("recent");
                  setSortBy("recent");
                }}
                style={{ color: 'var(--danger)', borderColor: 'rgba(233,46,48,0.15)', whiteSpace: 'nowrap' }}
              >
                Limpar
              </button>
              <button 
                type="button" 
                className="btn btn--primary btn--sm" 
                onClick={() => {
                  setSearch(tempSearch);
                  setUrgencyFilter(tempUrgency);
                  setSortBy(tempSortBy);
                }}
                style={{ whiteSpace: 'nowrap' }}
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}

      {loading && <div className="p-8 text-center text-muted">Carregando alertas...</div>}
      {error && <div className="p-8 text-center text-danger">{error}</div>}
      
      {!loading && !error && activeTab === "active" && processedAlerts.length === 0 ? (
        <EmptyState icon="✨" title="Tudo tranquilo" description={search || urgencyFilter !== "all" ? "Nenhum alerta bate com os filtros aplicados." : "Nenhum alerta crítico ativo na operação no momento."} />
      ) : (!loading && !error && activeTab === "active" && (
        <div className="table-wrap" style={{ marginTop: '16px' }}>
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Alerta / Detalhes</th>
                <th>Cliente</th>
                <th>Urgência</th>
                <th>Erros</th>
                <th>Ocorrência</th>
                {canManage && <th style={{ textAlign: "right", width: "100px" }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {processedAlerts.map(alert => {
                const isExpanded = expandedAlertId === alert.id;
                const events = Array.isArray(alertEvents[alert.id]) ? alertEvents[alert.id] : [];
                const isLoadingEvts = Boolean(loadingEvents[alert.id]);

                return (
                  <Fragment key={alert.id}>
                    <tr 
                      className={`clickable-row ${isExpanded ? "row-expanded" : ""}`} 
                      onClick={() => toggleExpandAlert(alert)}
                      style={{ 
                        cursor: 'pointer', 
                        background: isExpanded ? 'rgba(233,46,48,0.04)' : undefined,
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            color: isExpanded ? 'var(--color-primary)' : 'var(--text-muted)', 
                            transition: 'transform 0.2s ease', 
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                            flexShrink: 0 
                          }}>
                            ▶
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="table-title truncate" title={alert.title} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{alert.title}</div>
                            <div className="table-subtitle truncate" title={alert.message} style={{ fontSize: '12px', opacity: 0.85 }}>{alert.message || <span style={{ opacity: 0.5 }}>Sem mensagem técnica</span>}</div>
                          </div>
                        </div>
                      </td>
                      <td><strong style={{ fontSize: '13px' }}>{alert.client}</strong></td>
                      <td>{getUrgencyBadge(alert.urgency)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span 
                          className="badge badge--danger" 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '6px 12px', 
                            borderRadius: '8px', 
                            fontWeight: 600,
                            fontSize: '12px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {Icons.AlertTriangle && <Icons.AlertTriangle style={{ width: 13, height: 13 }} />}
                          <span>{alert.occurrence_count} erro{Number(alert.occurrence_count) > 1 ? 's' : ''}</span>
                          <span style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.85 }}>{isExpanded ? '▲' : '▼'}</span>
                        </span>
                      </td>
                      <td className="muted-cell" style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{formatDateTime(alert.occurred_at)}</td>
                      {canManage && (
                        <td style={{ textAlign: "right", whiteSpace: 'nowrap' }}>
                          <button 
                            type="button"
                            className="btn btn--outline btn--sm" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setAlertToResolve(alert); 
                              setResolutionNote("");
                            }}
                          >
                            Resolver
                          </button>
                        </td>
                      )}
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={canManage ? 6 : 5} style={{ padding: '4px 0', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                          <div style={{ padding: '16px 24px', animation: 'floatUpFilters 0.2s ease-out' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {Icons.AlertTriangle && <Icons.AlertTriangle style={{ color: 'var(--danger)', width: 16, height: 16 }} />}
                                Histórico de Ocorrências ({alert.occurrence_count})
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Clique em uma ocorrência para acessar a execução no n8n
                              </span>
                            </div>

                            {isLoadingEvts ? (
                              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                Carregando histórico de erros...
                              </div>
                            ) : events.length === 0 ? (
                              <div style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                Nenhum erro detalhado registrado para esta ocorrência.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {events.map((evt, idx) => {
                                  const n8nBaseUrl = (import.meta.env.VITE_N8N_BASE_URL || "https://n8ops.v4saman.com").replace(/\/+$/, "");
                                  const runId = evt.external_run_id || evt.automation_run_id;
                                  const workflowUrl = evt.automation_url || alert.automation_url;
                                  
                                  let targetUrl = null;
                                  if (runId) {
                                    const cleanRunId = String(runId).trim();
                                    if (cleanRunId.startsWith('http://') || cleanRunId.startsWith('https://')) {
                                      targetUrl = cleanRunId;
                                    } else if (workflowUrl && workflowUrl.includes('/workflow/')) {
                                      targetUrl = `${workflowUrl.replace(/\/+$/, '')}/executions/${cleanRunId}`;
                                    } else {
                                      targetUrl = `${n8nBaseUrl}/execution/${cleanRunId}`;
                                    }
                                  } else {
                                    targetUrl = workflowUrl || null;
                                  }

                                  return (
                                    <div
                                      key={evt.id || idx}
                                      onClick={() => {
                                        if (targetUrl) window.open(targetUrl, "_blank");
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 18px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        cursor: targetUrl ? 'pointer' : 'default',
                                        transition: 'all 0.15s ease',
                                        gap: '16px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                                        <span className="badge badge--danger" style={{ fontSize: '11px', fontWeight: 700, flexShrink: 0, padding: '4px 8px' }}>
                                          Ocorrência #{events.length - idx}
                                        </span>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {evt.error_message || alert.message || 'Falha de execução na automação'}
                                          </div>
                                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>ID Execução: <code style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border)' }}>{evt.automation_run_id || evt.external_run_id || 'n/a'}</code></span>
                                            <span>•</span>
                                            <span>{formatDateTime(evt.occurred_at || alert.occurred_at)}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {targetUrl && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, padding: '6px 12px', borderRadius: '6px', background: 'rgba(233,46,48,0.08)', color: 'var(--color-primary)' }}>
                                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                            Abrir no n8n
                                          </span>
                                          {Icons.ExternalLink && <Icons.ExternalLink style={{ width: 14, height: 14 }} />}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Modal de confirmação para resolver alerta */}
      {alertToResolve && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(0, 0, 0, 0.65)', 
            backdropFilter: 'blur(4px)',
            padding: '16px'
          }}
          onClick={() => !resolving && setAlertToResolve(null)}
        >
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '440px', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border)', 
              borderRadius: '16px', 
              boxShadow: 'var(--sh-lg)', 
              padding: '24px',
              animation: 'floatUpFilters 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(233,46,48,0.12)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {Icons.CheckCircle && <Icons.CheckCircle style={{ width: 22, height: 22 }} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Confirmar Resolução
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Esta ação marcará o alerta como resolvido.
                </span>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Deseja realmente marcar como resolvido o alerta de <strong>{alertToResolve.client}</strong> (<em>"{alertToResolve.title}"</em>)?
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Observação / Nota Técnica (opcional):
              </label>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Ex: Corrigido webhook no n8n / re-executado..." 
                value={resolutionNote} 
                onChange={(e) => setResolutionNote(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn--outline btn--sm" 
                onClick={() => setAlertToResolve(null)}
                disabled={resolving}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn--primary btn--sm" 
                onClick={confirmResolveAlert}
                disabled={resolving}
              >
                {resolving ? "Resolvendo..." : "Sim, Resolver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && activeTab === "history" && history.length === 0 ? (
        <EmptyState icon="📅" title="Sem histórico" description="Nenhum alerta foi resolvido ainda." />
      ) : (!loading && !error && activeTab === "history" && (
        <div className="table-wrap">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Alerta</th>
                <th>Origem</th>
                <th>Ocorrência</th>
                <th>Resolução</th>
                <th>Nota Técnica</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="font-medium flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                      {getUrgencyBadge(item.urgency)}
                    </div>
                    <div className="text-xs text-muted capitalize mt-1">{item.type.replace('_', ' ')}</div>
                  </td>
                  <td><strong>{item.client}</strong></td>
                  <td className="muted-cell">{formatDateTime(item.occurred_at)}</td>
                  <td className="text-sm">
                    <div style={{ color: "var(--text-primary)" }}>{formatDateTime(item.resolved_at)}</div>
                    <div className="text-xs text-muted">por {item.resolved_by_name || "Sistema"}</div>
                  </td>
                  <td className="max-w-xs truncate muted-cell" title={item.resolution_note}>
                    {item.resolution_note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
