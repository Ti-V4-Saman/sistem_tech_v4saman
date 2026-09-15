import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { Icons } from '../../icons/Icons';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Funções de auxílio
function calculateTrend(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export default function PageAdsDashboard() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [period, setPeriod] = useState(30); // days
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'meta', 'google'
  
  // New Filters
  const [googleType, setGoogleType] = useState('');
  const [campaign, setCampaign] = useState('');
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  
  const [dashboardData, setDashboardData] = useState(null);
  const [dailyData, setDailyData] = useState([]);

  useEffect(() => {
    api.getAdsClients()
      .then(res => {
        setClients(res.clients || []);
        if (res.clients && res.clients.length > 0) {
          setSelectedClientId(res.clients[0].id);
        }
      })
      .catch(err => {
        setError('Erro ao carregar clientes: ' + err.message);
      })
      .finally(() => setLoadingClients(false));
  }, []);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - period);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [period]);

  const fetchDashboardData = () => {
    if (!selectedClientId) return;
    
    setLoadingData(true);
    setError(null);
    
    const fetchOverview = api.getAdsOverview(selectedClientId, dateRange.startDate, dateRange.endDate);
    
    // In a real scenario, we would pass googleType and campaign to these API calls
    // For now we will just add them to the query in the backend later if needed.
    
    let fetchDaily = Promise.resolve({ data: [] });
    if (activeTab === 'meta') {
      fetchDaily = api.getAdsDaily(selectedClientId, 'meta', dateRange.startDate, dateRange.endDate);
    } else if (activeTab === 'google') {
      fetchDaily = api.getAdsDaily(selectedClientId, 'google', dateRange.startDate, dateRange.endDate);
    }

    Promise.all([fetchOverview, fetchDaily])
      .then(([overviewRes, dailyRes]) => {
        setDashboardData(overviewRes);
        setDailyData(dailyRes.data || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingData(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedClientId, dateRange, activeTab]);

  if (loadingClients) return <LoadingSpinner />;
  
  const selectedClientData = clients.find(c => c.id === selectedClientId);

  return (
    <div className="page-container">
      <SectionHeader 
        title="Dashboards de Mídia" 
        subtitle="Performance consolidada de anúncios"
        right={
          <button className="btn btn--secondary" onClick={() => setIsMaintenanceOpen(true)}>
            <Icons.Database /> Manutenção de Dados
          </button>
        }
      />

      {/* Filtros */}
      <div className="filters-bar" style={{ marginBottom: "24px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", padding: "16px", background: "var(--bg-card)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <select 
            className="editor-sidebar__select select--sm" 
            value={selectedClientId} 
            onChange={e => setSelectedClientId(e.target.value)}
            style={{ width: '100%', height: '36px' }}
          >
            <option value="">Selecione um cliente...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <select 
            className="editor-sidebar__select select--sm" 
            value={period} 
            onChange={e => setPeriod(Number(e.target.value))}
            style={{ width: '100%', height: '36px' }}
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={14}>Últimos 14 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
        
        {activeTab === 'google' && (
          <div style={{ flex: 1, minWidth: '150px' }}>
            <select 
              className="editor-sidebar__select select--sm" 
              value={googleType} 
              onChange={e => setGoogleType(e.target.value)}
              style={{ width: '100%', height: '36px' }}
            >
              <option value="">Todos os Tipos</option>
              <option value="SEARCH">Search</option>
              <option value="PERFORMANCE_MAX">Performance Max</option>
              <option value="ECOMMERCE">E-commerce (PMax Retail)</option>
              <option value="SHOPPING">Shopping</option>
              <option value="DISPLAY">Display</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>
        )}
        
        <div style={{ flex: 1, minWidth: '150px' }}>
          <input 
            type="text"
            className="form-input"
            placeholder="Buscar campanha..."
            value={campaign}
            onChange={e => setCampaign(e.target.value)}
            style={{ width: '100%', height: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            className="btn btn--primary btn--sm" 
            onClick={fetchDashboardData} 
            disabled={!selectedClientData || loadingData}
          >
            {loadingData ? 'Atualizando...' : 'Atualizar Dados'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="playbook-tabs" style={{ marginBottom: '24px' }}>
        <div 
          className={`playbook-tab ${activeTab === 'overview' ? 'playbook-tab--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <div className="playbook-tab__icon">
            <Icons.Activity />
          </div>
          <strong>Visão Geral</strong>
        </div>
        
        {selectedClientData?.meta_enabled && (
          <div 
            className={`playbook-tab ${activeTab === 'meta' ? 'playbook-tab--active' : ''}`}
            onClick={() => setActiveTab('meta')}
          >
            <div className="playbook-tab__icon" style={{ background: activeTab === 'meta' ? '#1877F2' : 'rgba(24,119,242,0.1)', color: activeTab === 'meta' ? '#fff' : '#1877F2' }}>
              <Icons.Target />
            </div>
            <strong>Meta Ads</strong>
          </div>
        )}
        
        {selectedClientData?.google_enabled && (
          <div 
            className={`playbook-tab ${activeTab === 'google' ? 'playbook-tab--active' : ''}`}
            onClick={() => setActiveTab('google')}
          >
            <div className="playbook-tab__icon" style={{ background: activeTab === 'google' ? '#DB4437' : 'rgba(219,68,55,0.1)', color: activeTab === 'google' ? '#fff' : '#DB4437' }}>
              <Icons.MousePointer />
            </div>
            <strong>Google Ads</strong>
          </div>
        )}
      </div>

      {loadingData ? (
        <LoadingSpinner />
      ) : !dashboardData?.mapped ? (
        <EmptyState 
          icon={<Icons.Database />}
          title="Cliente sem banco mapeado"
          description="Este cliente não possui um schema de banco de anúncios associado ou está sem dados."
        />
      ) : (
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="dashboard-grid">
              <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <MetricCard 
                  title="Investimento Total" 
                  value={formatCurrency(dashboardData.overview.spend)} 
                  icon={<Icons.DollarSign />} 
                />
                <MetricCard 
                  title="Impressões" 
                  value={formatNumber(dashboardData.overview.impressions)} 
                  icon={<Icons.Eye />} 
                />
                <MetricCard 
                  title="Cliques" 
                  value={formatNumber(dashboardData.overview.clicks)} 
                  icon={<Icons.MousePointer />} 
                />
                <MetricCard 
                  title="Resultados (Leads/Conv.)" 
                  value={formatNumber(dashboardData.overview.results)} 
                  icon={<Icons.Target />} 
                />
                <MetricCard 
                  title="Receita / Conv. Value" 
                  value={formatCurrency(dashboardData.overview.roasValue)} 
                  icon={<Icons.TrendingUp />} 
                />
                <MetricCard 
                  title="ROAS Consolidado" 
                  value={`${formatNumber(dashboardData.overview.roas)}x`} 
                  icon={<Icons.Activity />} 
                />
              </div>
            </div>
          )}

          {activeTab === 'meta' && dashboardData.meta && (
            <div>
               <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <MetricCard title="Investimento" value={formatCurrency(dashboardData.meta.spend)} icon={<Icons.DollarSign />} />
                <MetricCard title="Impressões" value={formatNumber(dashboardData.meta.impressions)} icon={<Icons.Eye />} />
                <MetricCard title="Cliques" value={formatNumber(dashboardData.meta.clicks)} icon={<Icons.MousePointer />} />
                <MetricCard title="CTR" value={`${formatNumber(dashboardData.meta.ctr)}%`} icon={<Icons.Activity />} />
                <MetricCard title="Leads" value={formatNumber(dashboardData.meta.leads)} icon={<Icons.Users />} />
                <MetricCard title="CPL" value={formatCurrency(dashboardData.meta.cpl)} icon={<Icons.CreditCard />} />
              </div>
              <div className="card" style={{ padding: '16px', height: '400px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>Investimento vs Resultados (Leads + Mensagens)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-muted)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
                    <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => `R$ ${val}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                    <Area yAxisId="left" type="monotone" dataKey="spend" name="Investimento (R$)" stroke="#1877F2" fill="#1877F2" fillOpacity={0.1} />
                    <Area yAxisId="right" type="monotone" dataKey="results" name="Resultados" stroke="#34A853" fill="#34A853" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'google' && dashboardData.google && (
            <div>
               <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <MetricCard title="Investimento" value={formatCurrency(dashboardData.google.spend)} icon={<Icons.DollarSign />} />
                <MetricCard title="Impressões" value={formatNumber(dashboardData.google.impressions)} icon={<Icons.Eye />} />
                <MetricCard title="Cliques" value={formatNumber(dashboardData.google.clicks)} icon={<Icons.MousePointer />} />
                <MetricCard title="Conversões" value={formatNumber(dashboardData.google.conversions)} icon={<Icons.Target />} />
                <MetricCard title="CPA" value={formatCurrency(dashboardData.google.cpa)} icon={<Icons.CreditCard />} />
                <MetricCard title="ROAS" value={`${formatNumber(dashboardData.google.roas)}x`} icon={<Icons.Activity />} />
              </div>
              <div className="card" style={{ padding: '16px', height: '400px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>Investimento vs Conversões</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-muted)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
                    <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => `R$ ${val}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                    <Area yAxisId="left" type="monotone" dataKey="spend" name="Investimento (R$)" stroke="#DB4437" fill="#DB4437" fillOpacity={0.1} />
                    <Area yAxisId="right" type="monotone" dataKey="conversions" name="Conversões" stroke="#34A853" fill="#34A853" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Maintenance Modal Mock */}
      {isMaintenanceOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', width: 500, borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Manutenção de Dados (Período)</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>Ações de recarga, exclusão e substituição de dados no banco (GT 50-53).</p>
            
            <label className="form-label">Operação</label>
            <select className="form-input" style={{ marginBottom: 16 }}>
              <option value="preview">Visualizar Impacto</option>
              <option value="delete">Excluir do banco</option>
              <option value="reload">Recarregar</option>
              <option value="replace">Substituir</option>
              <option value="restore">Restaurar Snapshot</option>
            </select>

            <label className="form-label">Motivo (Obrigatório)</label>
            <input type="text" className="form-input" placeholder="Descreva o motivo da manutenção..." style={{ marginBottom: 24 }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn--secondary" onClick={() => setIsMaintenanceOpen(false)}>Cancelar</button>
              <button className="btn btn--primary" onClick={() => setIsMaintenanceOpen(false)}>Executar (Mock)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
