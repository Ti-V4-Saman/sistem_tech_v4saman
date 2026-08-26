import { useState, useEffect, useCallback, useMemo } from "react";
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

  const handleResolveAlert = async (id) => {
    try {
      await api.resolveAlert(id, "Resolvido instantaneamente via painel de alertas");
      loadData();
    } catch (err) {
      alert(err.message || "Erro ao resolver alerta.");
    }
  };

  const activeAlertsCount = activeTab === "active" ? processedAlerts.length : 0;

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: '200px', maxWidth: '320px' }}>
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
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="editor-sidebar__select select--sm"
                  value={tempUrgency}
                  onChange={(e) => setTempUrgency(e.target.value)}
                  style={{ minWidth: '150px', flex: '1 1 150px' }}
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
                  style={{ minWidth: '150px', flex: '1 1 150px' }}
                >
                  <option value="recent">Mais recentes</option>
                  <option value="oldest">Mais antigos</option>
                  <option value="errors_desc">Mais erros</option>
                  <option value="errors_asc">Menos erros</option>
                  <option value="urgency_desc">Mais urgentes</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
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
                  style={{ gap: '6px', color: 'var(--danger)', borderColor: 'rgba(233,46,48,0.15)' }}
                >
                  Limpar Filtros
                </button>
                <button 
                  type="button" 
                  className="btn btn--primary btn--sm" 
                  onClick={() => {
                    setSearch(tempSearch);
                    setUrgencyFilter(tempUrgency);
                    setSortBy(tempSortBy);
                  }}
                >
                  Filtrar
                </button>
              </div>
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
              {processedAlerts.map(alert => (
                <tr 
                  key={alert.id} 
                  className={alert.automation_url ? "clickable-row" : ""} 
                  onClick={() => alert.automation_url && window.open(alert.automation_url, "_blank")}
                  style={{ cursor: alert.automation_url ? 'pointer' : 'default' }}
                >
                  <td>
                    <div className="table-title truncate max-w-md" title={alert.title} style={{ color: "var(--text-primary)" }}>{alert.title}</div>
                    <div className="table-subtitle truncate max-w-md" title={alert.message}>{alert.message || <span style={{ opacity: 0.5 }}>Sem mensagem técnica</span>}</div>
                  </td>
                  <td><strong>{alert.client}</strong></td>
                  <td>{getUrgencyBadge(alert.urgency)}</td>
                  <td><strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{alert.occurrence_count}</strong></td>
                  <td className="muted-cell">{formatDateTime(alert.occurred_at)}</td>
                  {canManage && (
                    <td style={{ textAlign: "right" }}>
                      <button 
                        className="btn btn--outline btn--sm" 
                        onClick={(e) => { e.stopPropagation(); handleResolveAlert(alert.id); }}
                      >
                        Resolver
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

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
