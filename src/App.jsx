import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "./services/api";

// Icons (SVG)
const Icons = {
  Dashboard: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Users: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Zap: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Phone: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  Doc: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Lock: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
  Search: () => <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Bell: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  Menu: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Bot: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
};

function Badge({ status, type = "client" }) {
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
    }
  };
  const c = map[type]?.[status] || { label: status, cls: "badge--default" };
  return <span className={`badge ${c.cls}`}>{c.label}</span>;
}

function ToolTag({ tool }) {
  return <span className="badge badge--default" style={{background: "var(--bg-secondary)", color: "var(--text-secondary)"}}>{tool}</span>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "var(--sh-md)" }}>
      {label && <p style={{ color: "var(--text-muted)", marginBottom: 6 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "var(--text-primary)", fontWeight: 600, margin: "2px 0" }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

function ExecutionDash({ executions, workflowId }) {
  if (!executions || executions.length === 0) return <span style={{color: "var(--text-muted)", fontSize: 12}}>Sem histórico</span>;

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {executions.map(exec => {
        const isError = exec.status === "error";
        const isSuccess = exec.status === "success";
        const color = isError ? "var(--danger)" : isSuccess ? "var(--success)" : "var(--warning)";
        
        return (
          <div 
            key={exec.id}
            title={isError ? "Falha - Clique para abrir no n8n" : `Status: ${exec.status}`}
            style={{
              width: 12, 
              height: 12, 
              borderRadius: 3,
              backgroundColor: color,
              cursor: isError ? "pointer" : "default",
              opacity: 0.8
            }}
            onMouseOver={e => e.currentTarget.style.opacity = 1}
            onMouseOut={e => e.currentTarget.style.opacity = 0.8}
            onClick={() => {
              if (isError) {
                window.open(`https://n8ops.v4saman.com/workflow/${workflowId}/executions/${exec.id}`, '_blank');
              }
            }}
          />
        );
      })}
    </div>
  );
}

// ── PAGES ──
function PageDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardData().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  const { metrics, charts } = data;

  return (
    <div>
      <div className="page-header">
        <div className="page-header__greeting">Visão Geral</div>
        <div className="page-header__title">Dashboard Operacional</div>
        <div className="page-header__subtitle">Acompanhe a saúde e o volume de integrações em tempo real.</div>
      </div>

      <div className="g4" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-icon-wrap"><Icons.Users /></div>
          <div className="stat-val">{metrics.activeClients}</div>
          <div className="stat-label">Clientes Ativos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap"><Icons.Zap /></div>
          <div className="stat-val">{metrics.activeAutomations}</div>
          <div className="stat-label">Automações Ativas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap"><Icons.Phone /></div>
          <div className="stat-val">{metrics.activeInstances}</div>
          <div className="stat-label">Instâncias Ativas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap"><Icons.Bot /></div>
          <div className="stat-val">{metrics.activeBots}</div>
          <div className="stat-label">Bots Ativos</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Crescimento do Ecossistema</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={charts.growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip cursor={{ stroke: "var(--border-subtle-hover)", strokeWidth: 1 }} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)', paddingTop: '15px' }} iconType="circle" />
              <Line type="monotone" dataKey="clientes" name="Clientes" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3, fill: "#fff", stroke: "var(--color-primary)", strokeWidth: 2 }} activeDot={{ r: 5, fill: "var(--color-primary)" }} />
              <Line type="monotone" dataKey="automacoes" name="Automações" stroke="var(--neutral-fg-high-contrast)" strokeWidth={2} dot={{ r: 3, fill: "#fff", stroke: "var(--neutral-fg-high-contrast)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="instancias" name="Instâncias" stroke="var(--neutral-fg-low-contrast)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: "#fff", stroke: "var(--neutral-fg-low-contrast)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="bots" name="Bots" stroke="var(--rose-500)" strokeWidth={2} dot={{ r: 3, fill: "#fff", stroke: "var(--rose-500)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PageClients() {
  const [q, setQ] = useState("");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  useEffect(() => {
    api.getClients().then(res => {
      setClients(res);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  }, [q, clients]);

  const handleOpenClient = (id) => {
    setSelectedClientId(id);
    setDetailLoading(true);
    setSelectedTool(null);
    api.getClientDetails(id).then(res => {
      setClientDetail(res);
      setDetailLoading(false);
    });
  };

  const handleCloseClient = () => {
    setSelectedClientId(null);
    setClientDetail(null);
  };

  if (selectedClientId) {
    if (detailLoading || !clientDetail) return <LoadingSpinner />;
    
    const tools = clientDetail.tools;
    
    let selectedToolItems = [];
    if (selectedTool) {
      const toolAutomations = clientDetail.automations ? clientDetail.automations.filter(a => a.type === selectedTool) : [];
      const toolInstances = clientDetail.instances ? clientDetail.instances.filter(i => i.tool === selectedTool) : [];
      const toolTypebots = (selectedTool === 'Typebot' && clientDetail.typebots) ? clientDetail.typebots : [];
      selectedToolItems = [
        ...toolAutomations.map(a => ({ ...a, _category: "Automação" })), 
        ...toolInstances.map(i => ({ ...i, _category: "Instância" })),
        ...toolTypebots.map(t => ({ ...t, _category: "Fluxo Typebot" }))
      ];
    }

    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {/* Header Section */}
        <div style={{ marginBottom: 32 }}>
          <div 
            onClick={handleCloseClient} 
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 6, 
              color: "var(--text-muted)", 
              fontSize: 13, 
              cursor: "pointer", 
              marginBottom: 16,
              transition: "color 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseOut={e => e.currentTarget.style.color = "var(--text-muted)"}
          >
            ← Voltar para clientes
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
                {clientDetail.name}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>{clientDetail.company}</span>
                <Badge status={clientDetail.status} type="client" />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                {clientDetail.activeWorkflows} <span style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 400 }}>/ {clientDetail.totalWorkflows}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Automações Ativas</div>
            </div>
          </div>
        </div>
        
        {/* Tools Cards (Using generic dark panel or brand color) */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {tools.map(tool => {
              const count = (clientDetail.automations ? clientDetail.automations.filter(a => a.type === tool).length : 0) + 
                            (clientDetail.instances ? clientDetail.instances.filter(i => i.tool === tool).length : 0) +
                            ((tool === 'Typebot' && clientDetail.typebots) ? clientDetail.typebots.length : 0);
              return (
                <div 
                  key={tool} 
                  onClick={() => setSelectedTool(tool === selectedTool ? null : tool)}
                  style={{
                    background: selectedTool === tool ? "var(--neutral-bg-subtle-02)" : "var(--bg-card)",
                    border: `1px solid ${selectedTool === tool ? "var(--color-primary)" : "var(--border)"}`,
                    borderRadius: 12,
                    padding: "20px 24px",
                    cursor: "pointer",
                    minWidth: 220,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    transition: "all 0.2s",
                    boxShadow: "var(--sh-xs)"
                  }}
                >
                  <div style={{ padding: "8px 12px", background: "var(--neutral-bg-subtle-01)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <ToolTag tool={tool} />
                  </div>
                  <div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{tool}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{count} integrações</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Tool Detail Table */}
        {selectedTool && (
          <div className="table-wrap" style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Integrações de {selectedTool}</span>
            </div>
            {selectedToolItems.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)", fontSize: 14, background: "var(--bg-card)" }}>Nenhuma integração encontrada para esta ferramenta.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome / Identificador</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Execuções</th>
                    {selectedTool === 'Typebot' && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedToolItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{item.name}</div>
                        {item.description && <div style={{ color: "var(--text-secondary)", fontSize: 12, maxWidth: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</div>}
                        {item.identifier && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{item.identifier}</div>}
                      </td>
                      <td><span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{item._category}</span></td>
                      <td><Badge status={item.status} type={item._category === "Automação" ? "auto" : "client"} /></td>
                      <td>
                        {item._category === "Automação" && item.executions ? (
                          <ExecutionDash executions={item.executions} workflowId={item.id} />
                        ) : (
                          <span style={{color: "var(--text-muted)", fontSize: 12}}>N/A</span>
                        )}
                      </td>
                      {selectedTool === 'Typebot' && (
                        <td>
                          {item.url && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: "4px 12px", fontSize: 12 }}
                              onClick={() => window.open(item.url, '_blank')}
                            >
                              Abrir Fluxo
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }
  
  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <div>
          <div className="page-header__greeting">Database</div>
          <div className="page-header__title">Clientes</div>
          <div className="page-header__subtitle">{loading ? "Carregando..." : `${filtered.length} encontrados no banco`}</div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div className="search-wrap">
            <span className="si"><Icons.Search /></span>
            <input className="search-input" placeholder="Buscar cliente..." value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>
      </div>
      
      {loading ? <LoadingSpinner /> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Automações</th>
                <th>Bots</th>
                <th style={{ textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{c.company}</div>
                  </td>
                  <td><Badge status={c.status} type="client" /></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: c.activeWorkflows > 0 ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>{c.activeWorkflows || 0}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>/ {c.totalWorkflows || 0}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: c.activeTypebots > 0 ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>{c.activeTypebots || 0}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>/ {c.totalTypebots || 0}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn--outline" onClick={() => handleOpenClient(c.id)}>
                      Acessar →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PageAutomations() {
  const [q, setQ] = useState("");
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAutomations().then(res => {
      setAutomations(res);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return automations.filter(a => a.name.toLowerCase().includes(q.toLowerCase()));
  }, [q, automations]);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <div>
          <div className="page-header__greeting">Gestão de Fluxos</div>
          <div className="page-header__title">Automações</div>
          <div className="page-header__subtitle">{loading ? "Carregando..." : `${filtered.length} encontradas`}</div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div className="search-wrap">
            <span className="si"><Icons.Search /></span>
            <input className="search-input" placeholder="Buscar automação..." value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <button className="btn btn--primary">Novo Webhook</button>
        </div>
      </div>
      
      {loading ? <LoadingSpinner /> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Automação</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.description}</div>
                  </td>
                  <td><ToolTag tool={a.type} /></td>
                  <td><Badge status={a.status} type="auto" /></td>
                  <td style={{ color: "var(--text-secondary)" }}>{a.owner}</td>
                  <td style={{ color: "var(--text-muted)" }}>{a.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── SHELL ──
const NAV = [
  { id: "dashboard", label: "Início", icon: <Icons.Dashboard /> },
  { id: "clients", label: "Clientes", icon: <Icons.Users /> },
  { isSection: true, label: "Gestão Operacional" },
  { id: "automations", label: "Automações (n8n/Typebot)", icon: <Icons.Zap /> },
  { id: "instances", label: "Instâncias (WhatsApp)", icon: <Icons.Phone /> },
  { isSection: true, label: "Sistema" },
  { id: "docs", label: "Docs", icon: <Icons.Doc /> },
  { id: "users", label: "Usuários", icon: <Icons.Lock /> },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch(page) {
      case "dashboard": return <PageDashboard />;
      case "clients": return <PageClients />;
      case "automations": return <PageAutomations />;
      default: return <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Módulo "{page}" será conectado à API em breve.</div>;
    }
  };

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar__header">
            <div className="org-switcher">
              <div className="org-badge">V4</div>
              <span className="org-name">V4 Company</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>⌄</span>
            </div>
          </div>
          <nav className="sidebar__nav" style={{ paddingTop: 8 }}>
            {NAV.map((item, i) => {
              if (item.isSection) {
                return <div key={`sec-${i}`} className="nav-section-label">{item.label}</div>;
              }
              return (
                <button 
                  key={item.id} 
                  className={`nav-item ${page === item.id ? 'nav-item--active' : ''}`} 
                  onClick={() => setPage(item.id)}
                >
                  <span className="nav-item__icon">{item.icon}</span>
                  <span className="nav-item__label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      <div className="main-area">
        <header className="topbar">
          <div className="topbar__left">
            <button className="btn btn--ghost" style={{ padding: "4px 8px" }} onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Icons.Menu />
            </button>
          </div>
          <div className="topbar__right">
            <div className="avatar-initials">GG</div>
          </div>
        </header>

        <main className="main-content">
          <div className="content-wrapper">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
