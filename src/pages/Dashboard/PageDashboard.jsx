import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";
import { CustomTooltip } from "../../components/ui/CustomTooltip";
import { DashboardSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { MetricCard } from "../../components/ui/MetricCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { Icons } from "../../icons/Icons";

function normalizeHealthDistribution(clients = [], alerts = []) {
  const distribution = {
    ok: 0,
    falha_baixa: 0,
    falha_media: 0,
    falha_alta: 0,
    falha_urgente: 0
  };

  clients.forEach((client) => {
    if (client.status !== 'active') return;
    
    const clientAlerts = alerts.filter(a => a.client === client.name);
    
    if (clientAlerts.length === 0) {
      distribution.ok += 1;
      return;
    }

    const urgencies = clientAlerts.map(a => a.urgency);
    if (urgencies.includes('urgent')) distribution.falha_urgente += 1;
    else if (urgencies.includes('high')) distribution.falha_alta += 1;
    else if (urgencies.includes('medium')) distribution.falha_media += 1;
    else distribution.falha_baixa += 1;
  });

  return [
    { name: "Saudável (Sem Erros)", value: distribution.ok, color: "var(--success)" },
    { name: "Falha Baixa (Azul)", value: distribution.falha_baixa, color: "#3b82f6" },
    { name: "Falha Média (Verde)", value: distribution.falha_media, color: "#22c55e" },
    { name: "Falha Alta (Amarelo)", value: distribution.falha_alta, color: "#eab308" },
    { name: "Falha Urgente (Vermelho)", value: distribution.falha_urgente, color: "#e92e30" }
  ].filter(item => item.value > 0);
}

function num(value) {
  return Number(value || 0);
}

function hasData(value) {
  if (Array.isArray(value)) return value.length > 0;
  return num(value) > 0;
}

function formatPercentage(part, total) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

const URGENCY_BADGES = {
  urgent: <span className="badge badge--danger" style={{ fontWeight: 600 }}>Urgente</span>,
  high: <span className="badge" style={{ backgroundColor: "#eab308", color: "white", fontWeight: 600 }}>Alta</span>,
  medium: <span className="badge badge--success" style={{ fontWeight: 600 }}>Média</span>,
  low: <span className="badge" style={{ backgroundColor: "#3b82f6", color: "white", fontWeight: 600 }}>Baixa</span>,
};

function buildMetricCards(metrics = {}, alerts = [], setPage, onToggleRisk, isAdmin = true) {
  const candidates = [
    {
      label: "MRR monitorado",
      value: formatCurrency(num(metrics.total_mrr)),
      raw: metrics.total_mrr,
      helper: "Receita recorrente dos clientes ativos",
      icon: <Icons.Dollar />,
      tone: "brand",
    },
    {
      label: "Clientes ativos",
      value: num(metrics.activeClients),
      raw: metrics.activeClients,
      helper: metrics.onboardingClients ? `${metrics.onboardingClients} em implantação` : "Base operacional ativa",
      icon: <Icons.Users />,
      tone: "neutral",
    },
    {
      label: "Automações ativas",
      value: num(metrics.activeAutomations),
      raw: metrics.activeAutomations,
      helper: "Workflows n8n operacionais",
      icon: <Icons.Zap />,
      tone: "brand",
    },
    {
      label: "Bots publicados",
      value: num(metrics.activeBots),
      raw: metrics.activeBots,
      helper: "Typebots disponíveis para uso",
      icon: <Icons.Bot />,
      tone: "brand",
    },
    {
      label: "WhatsApp ativo",
      value: num(metrics.activeInstances),
      raw: metrics.activeInstances,
      helper: "Instâncias conectadas",
      icon: <Icons.Phone />,
      tone: "brand",
    },
    {
      label: "Clientes em risco",
      value: num(metrics.clientsAtRisk),
      raw: metrics.clientsAtRisk,
      helper: "Clientes com falhas ativas nos últimos 5 dias",
      icon: <Icons.AlertTriangle />,
      tone: "warning",
      onClick: onToggleRisk,
      adminOnly: true,
    },
    {
      label: "Execuções OK",
      value: `${num(metrics.successRate)}%`,
      raw: metrics.totalRuns || metrics.successfulRuns,
      helper: `${num(metrics.successfulRuns)} de ${num(metrics.totalRuns)} execuções`,
      icon: <Icons.CheckCircle />,
      tone: "success",
      adminOnly: true,
    },
    {
      label: "Execuções com falha",
      value: `${num(metrics.failureRate)}%`,
      raw: metrics.failedRuns,
      helper: `${num(metrics.failedRuns)} falhas registradas`,
      icon: <Icons.XCircle />,
      tone: "danger",
      onClick: setPage ? () => setPage("alerts") : undefined,
      adminOnly: true,
    },
    {
      label: "Tickets abertos",
      value: num(metrics.open_tickets),
      raw: metrics.open_tickets,
      helper: "Demandas pendentes de suporte",
      icon: <Icons.Doc />,
      tone: "warning",
    },
    {
      label: "Incidentes abertos",
      value: num(metrics.open_incidents),
      raw: metrics.open_incidents,
      helper: "Problemas ativos reportados",
      icon: <Icons.Bell />,
      tone: "danger",
    },
    {
      label: "Credenciais expiradas",
      value: num(metrics.expired_credentials),
      raw: metrics.expired_credentials,
      helper: "Podem quebrar integrações",
      icon: <Icons.Lock />,
      tone: "danger",
    },
  ];

  // Para não-admins, não exibimos mais os cards adminOnly (antes exibia com cadeado)
  return candidates.filter((card) => {
    if (card.adminOnly && !isAdmin) return false;
    if (card.adminOnly) return true;
    return hasData(card.raw);
  });
}

function topClientsToChart(clients = []) {
  return clients
    .map((client) => ({
      name: client.name || "Cliente",
      automations: num(client.automations),
      bots: num(client.bots),
      whatsapp: num(client.whatsapp_instances || client.whatsappInstances),
    }))
    .filter((client) => client.automations + client.bots + client.whatsapp > 0)
    .slice(0, 7);
}

function normalizeCategoryCounts(items = [], keyName, labels = {}) {
  return items
    .map((item) => ({
      key: item[keyName] || item.key || item.name || "other",
      name: labels[item[keyName]] || item[keyName] || item.name || "Outros",
      value: num(item.count || item.value),
    }))
    .filter((item) => item.value > 0);
}

const PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const SEVERITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

function DashboardError({ message, onRetry }) {
  return (
    <EmptyState
      icon="⚠️"
      title="Não foi possível carregar o dashboard"
      description={message || "Verifique se o backend está ativo e se o usuário possui permissão para visualizar o painel."}
      action={<button className="btn btn--primary" onClick={onRetry}>Tentar novamente</button>}
    />
  );
}

// Inline panel for "Clientes em Risco" — renders between metric-grid and charts
function RiskPanel({ alerts, onNavigateToClient, onNavigateToAlerts, onClose }) {
  return (
    <section
      className="risk-panel"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        marginBottom: "24px",
        overflow: "hidden",
        animation: "slideDown 0.25s ease",
      }}
    >
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            Clientes em Risco
            <span style={{
              background: "var(--danger)",
              color: "white",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: "20px",
              padding: "2px 8px",
            }}>{alerts.length}</span>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
            Falhas identificadas nos últimos 5 dias
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn btn--outline btn--sm" onClick={onNavigateToAlerts}>
            Ver todos os alertas →
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              cursor: "pointer",
              color: "var(--text-muted)",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              transition: "all 0.2s",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        {alerts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
            ✨ Nenhum cliente em risco encontrado nos últimos 5 dias.
          </div>
        ) : (
          <table className="table table--compact" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Integração / Erro</th>
                <th>Urgência</th>
                <th>Ocorrências</th>
                <th>Última Ocorrência</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, index) => (
                <tr
                  key={index}
                  className={alert.clientId || alert.client ? "clickable-row" : ""}
                  onClick={() => alert.client && onNavigateToClient && onNavigateToClient(alert.client)}
                  style={{ cursor: alert.client ? "pointer" : "default" }}
                >
                  <td><strong>{alert.client}</strong></td>
                  <td>
                    <div className="table-title">{alert.title}</div>
                    <div className="table-subtitle">{alert.type?.replace(/_/g, ' ')}</div>
                  </td>
                  <td>{URGENCY_BADGES[alert.urgency] || <span className="badge">{alert.urgency}</span>}</td>
                  <td><strong>{alert.occurrence_count}</strong></td>
                  <td className="muted-cell">{alert.occurred_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/**
 * @module PageDashboard
 * @description Painel executivo focado em dados populados, alertas acionáveis e leitura rápida da operação.
 */
export default function PageDashboard({ setPage, isAdmin = false }) {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const riskPanelRef = useRef(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "dashboard") {
        setShowRiskPanel(false);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const loadDashboard = useCallback(() => {
    const requestId = requestSeq.current + 1;
    requestSeq.current = requestId;
    setLoading(true);
    setError(null);

    Promise.all([api.getDashboardData(), api.getDashboardAlerts()])
      .then(([dashRes, alertsRes]) => {
        if (requestSeq.current !== requestId) return;
        setData(dashRes || null);
        setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
      })
      .catch((err) => {
        if (requestSeq.current === requestId) setError(err.message || "Erro ao carregar dados do dashboard.");
      })
      .finally(() => {
        if (requestSeq.current === requestId) setLoading(false);
      });

    return () => {
      requestSeq.current += 1;
    };
  }, []);

  useEffect(() => loadDashboard(), [loadDashboard]);

  // Scroll to risk panel when it opens
  useEffect(() => {
    if (showRiskPanel && riskPanelRef.current) {
      setTimeout(() => {
        riskPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }, [showRiskPanel]);

  const handleToggleRisk = () => setShowRiskPanel(prev => !prev);

  const handleNavigateToClient = (clientName) => {
    // Store client search so PageClients can pick it up
    localStorage.setItem("techhub.clientSearch", clientName);
    setPage("clients");
  };

  const metrics = data?.metrics || {};
  const growthData = data?.charts?.growthData || [];
  const recentClients = data?.recentClients || [];
  const metricCards = useMemo(() => buildMetricCards(metrics, alerts, setPage, handleToggleRisk, isAdmin), [metrics, alerts, setPage, showRiskPanel, isAdmin]);
  const topClientsChart = useMemo(() => topClientsToChart(recentClients), [recentClients]);
  const ticketPriorityData = useMemo(() => normalizeCategoryCounts(data?.ticketPriority, "priority", PRIORITY_LABELS), [data]);
  const incidentSeverityData = useMemo(() => normalizeCategoryCounts(data?.incidentSeverity, "severity", SEVERITY_LABELS), [data]);
  const criticalAlerts = alerts.filter((item) => item.type === "automation_error" || item.type === "credential_expired");
  const hasGrowthData = growthData.some((row) => num(row.clientes) + num(row.automacoes) + num(row.bots) + num(row.instancias) > 0);
  
  const healthData = useMemo(() => normalizeHealthDistribution(recentClients, alerts), [recentClients, alerts]);
  const hasSupportCharts = ticketPriorityData.length > 0 || incidentSeverityData.length > 0;

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError message={error} onRetry={loadDashboard} />;
  if (!data) {
    return (
      <EmptyState
        icon="📊"
        title="Dashboard sem dados"
        description="Nenhuma métrica retornou da API. Assim que o sistema receber clientes, automações ou integrações, o painel será preenchido."
      />
    );
  }

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <div className="dashboard-hero__eyebrow">Painel executivo</div>
          <h1 className="dashboard-hero__title">Operação TechOps em tempo real</h1>
          <p className="dashboard-hero__subtitle">
            Indicadores populados, riscos ativos e integrações críticas priorizadas para decisão rápida.
          </p>
        </div>
        <div className={`dashboard-hero__status ${isAdmin && criticalAlerts.length ? "dashboard-hero__status--danger" : "dashboard-hero__status--success"}`}>
          <span className="dashboard-hero__pulse" />
          {isAdmin
            ? (criticalAlerts.length ? `${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""} ativo${criticalAlerts.length > 1 ? "s" : ""}` : "Operação estável")
            : "Operação em execução"
          }
          {!isAdmin && (
            <span title="Detalhes de alertas visíveis apenas para administradores" style={{ marginLeft: 6, opacity: 0.6, fontSize: "12px" }}>🔒</span>
          )}
        </div>
      </section>

      {metricCards.length > 0 ? (
        <section className="metric-grid" aria-label="Indicadores principais">
          {metricCards.map((card) => <MetricCard key={card.label} {...card} isAdmin={isAdmin} />)}
        </section>
      ) : (
        <EmptyState
          icon="📈"
          title="Sem indicadores populados"
          description="Os cards do dashboard foram ocultados porque todas as métricas retornaram zeradas."
          compact
        />
      )}

      {/* Risk panel — inline between metrics and charts, toggle via card click */}
      {showRiskPanel && (
        <div ref={riskPanelRef}>
          <RiskPanel
            alerts={alerts}
            onNavigateToClient={handleNavigateToClient}
            onNavigateToAlerts={() => { setShowRiskPanel(false); setPage("alerts"); }}
            onClose={() => setShowRiskPanel(false)}
          />
        </div>
      )}

      <section className="dashboard-grid dashboard-grid--equal">
        {healthData.length > 0 && (
          <article className="executive-card">
            <SectionHeader
              eyebrow="Panorama"
              title="Saúde dos Projetos"
              description="Monitoramento da proporção de clientes operando sem falhas em relação aos impactados."
            />
            <div className="chart-frame flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '16px' }}>
                <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {healthData.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
                <span className="text-xs text-muted">Clientes</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 justify-center">
              {healthData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs text-muted whitespace-nowrap">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </article>
        )}
        {hasGrowthData && (
          <article className="executive-card">
            <SectionHeader
              eyebrow="Tendência"
              title="Crescimento do ecossistema"
              description="Evolução agregada de clientes, automações e canais conectados."
            />
            <div className="chart-frame">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={growthData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dashboardAutomations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6c37" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#ff6c37" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dashboardBots" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="clientes" name="Clientes" stroke="var(--color-primary)" fill="url(#dashboardClients)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="automacoes" name="Automações" stroke="#ff6c37" fill="url(#dashboardAutomations)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="bots" name="Bots" stroke="#a855f7" fill="url(#dashboardBots)" strokeWidth={2} />
                  <Area type="monotone" dataKey="instancias" name="WhatsApp" stroke="var(--success)" fillOpacity={0.04} fill="var(--success)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        )}

        {topClientsChart.length > 0 && (
          <article className="executive-card">
            <SectionHeader
              eyebrow="Ranking"
              title="Clientes com mais integrações"
              description="Volume total de automações, bots e instâncias por cliente."
            />
            <div className="chart-frame">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topClientsChart} layout="vertical" margin={{ top: 8, right: 8, left: 18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="automations" name="Automações" stackId="a" fill="var(--color-primary)" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="bots" name="Bots" stackId="a" fill="#a855f7" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="whatsapp" name="WhatsApp" stackId="a" fill="var(--success)" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        )}
      </section>

      {recentClients.length > 0 && (
        <section className="dashboard-grid">
          <article className="executive-card">
            <SectionHeader
              eyebrow="Base operacional"
              title="Clientes relevantes"
              description="Lista enxuta para auditoria rápida de volume e saúde. Clique para ir ao cliente."
            />
            <div className="table-wrap table-wrap--flat">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Automações</th>
                    <th>Bots</th>
                    <th>WhatsApp</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClients.slice(0, 8).map((client, index) => {
                    const automations = num(client.automations);
                    const bots = num(client.bots);
                    const whatsapp = num(client.whatsapp_instances || client.whatsappInstances);

                    return (
                      <tr
                        key={`${client.name}-${index}`}
                        className="clickable-row"
                        onClick={() => handleNavigateToClient(client.name)}
                        style={{ cursor: "pointer" }}
                      >
                        <td><strong>{client.name}</strong></td>
                        <td>{automations}</td>
                        <td>{bots}</td>
                        <td>{whatsapp}</td>
                        <td><strong>{automations + bots + whatsapp}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {hasSupportCharts && (
        <section className="dashboard-grid dashboard-grid--two">
          {ticketPriorityData.length > 0 && (
            <article className="executive-card">
              <SectionHeader
                eyebrow="Suporte"
                title="Tickets por prioridade"
                description="Distribuição dos tickets abertos por nível de urgência."
              />
              <div className="chart-frame chart-frame--compact">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ticketPriorityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Tickets" fill="#a855f7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}

          {incidentSeverityData.length > 0 && (
            <article className="executive-card">
              <SectionHeader
                eyebrow="Incidentes"
                title="Incidentes por severidade"
                description="Leitura rápida do nível de criticidade dos problemas ativos."
              />
              <div className="chart-frame chart-frame--compact">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={incidentSeverityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Incidentes" fill="var(--danger)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
