import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "../../services/api";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { MetricCard } from "../../components/ui/MetricCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusPill } from "../../components/ui/StatusPill";
import { formatCurrency } from "../../utils/formatters";
import { TelephonyModal } from "./TelephonyModal";

export default function PageTelephony({ permissions = [] }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState("");
  const [tempSearch, setTempSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tempCategory, setTempCategory] = useState("");
  const [status, setStatus] = useState("");
  const [tempStatus, setTempStatus] = useState("");
  const [team, setTeam] = useState("");
  const [tempTeam, setTempTeam] = useState("");
  const [sector, setSector] = useState("");
  const [tempSector, setTempSector] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "telephony") {
        setSelectedItem(null);
        setIsModalOpen(false);
        setSearch("");
        setTempSearch("");
        setCategory("");
        setTempCategory("");
        setStatus("");
        setTempStatus("");
        setTeam("");
        setTempTeam("");
        setSector("");
        setTempSector("");
        setShowFilters(false);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const canManage = permissions.includes("telephony.manage") || permissions.includes("*");
  const canExport = permissions.includes("telephony.export") || permissions.includes("*");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await api.getTelephony({ limit: 1000 });
      setData(listRes.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Erro ao carregar telefonia.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const uniqueTeams = useMemo(() => {
    const list = data.map(item => item.team_name).filter(Boolean);
    return [...new Set(list)].sort();
  }, [data]);

  const uniqueSectors = useMemo(() => {
    const list = data.map(item => item.sector).filter(Boolean);
    return [...new Set(list)].sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = !search || 
        String(item.normalized_number).toLowerCase().includes(search.toLowerCase()) ||
        String(item.display_number).toLowerCase().includes(search.toLowerCase()) ||
        String(item.responsible_name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(item.sector || "").toLowerCase().includes(search.toLowerCase()) ||
        String(item.team_name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(item.routing || "").toLowerCase().includes(search.toLowerCase());
        
      const matchesCategory = !category || item.category === category;
      const matchesStatus = !status || item.status === status;
      const matchesTeam = !team || (team === "Sem time" ? !item.team_name : item.team_name === team);
      const matchesSector = !sector || (sector === "Sem setor" ? !item.sector : item.sector === sector);
      
      return matchesSearch && matchesCategory && matchesStatus && matchesTeam && matchesSector;
    });
  }, [data, search, category, status, team, sector]);

  const summary = useMemo(() => {
    const active = filteredData.filter(item => item.status === 'ativo').length;
    const waiting = filteredData.filter(item => item.status === 'aguardando_ativacao').length;
    const inactive = filteredData.filter(item => item.status === 'inativo').length;
    const total_cost = filteredData.reduce((acc, item) => acc + Number(item.monthly_fee || 0), 0);
    
    return {
      active,
      waiting,
      inactive,
      total_cost
    };
  }, [filteredData]);

  const handleExportCsv = () => {
    window.open(`${import.meta.env.VITE_API_URL || "/api"}/telephony/export/csv?token=${api.getStoredSession()?.accessToken}`, '_blank');
  };

  const handleExportSql = () => {
    window.open(`${import.meta.env.VITE_API_URL || "/api"}/telephony/export/sql?token=${api.getStoredSession()?.accessToken}`, '_blank');
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    event.target.value = '';
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r);
        const separator = text.includes(';') ? ';' : ',';
        const headers = rows.shift().split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
        
        let imported = 0;
        setLoading(true);
        for (const rowText of rows) {
          const cols = rowText.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
          const data = {};
          headers.forEach((h, i) => { if (cols[i]) data[h] = cols[i]; });
          
          if (!data.normalized_number) continue;
          
          await api.createTelephony({
            normalized_number: data.normalized_number,
            display_number: data.display_number || data.normalized_number,
            category: data.category || 'fixo',
            status: data.status || 'ativo',
            monthly_fee: data.monthly_fee ? Number(data.monthly_fee) : 0,
            sector: data.sector || '',
            team_name: data.team_name || ''
          }).catch(err => console.error("Ignorado duplicado ou erro:", err));
          imported++;
        }
        alert(`Importação concluída. ${imported} registros processados.`);
        loadData();
      } catch (err) {
        alert("Erro ao processar arquivo: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page-layout">
      <SectionHeader
        title="Gestão de Telefonia"
        description="Controle de linhas fixas, celulares e VoIP da operação."
        right={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {canExport && (
              <>
                <input type="file" ref={fileInputRef} accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
                <button 
                  className="btn btn--secondary" 
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', gap: '6px' }} 
                  onClick={() => fileInputRef.current?.click()}
                >
                  📥 Importar CSV
                </button>
                <button 
                  className="btn btn--secondary" 
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', gap: '6px' }} 
                  onClick={handleExportCsv}
                >
                  📤 Exportar CSV
                </button>
              </>
            )}
            {canManage && (
              <button className="btn btn--primary" onClick={() => { setSelectedItem(null); setIsModalOpen(true); }}>
                Nova Linha
              </button>
            )}
          </div>
        }
      />

      {summary && (
        <section className="metric-grid" style={{ marginBottom: '36px' }}>
          <MetricCard label="Custo Mensal" value={formatCurrency(Number(summary.total_cost || 0))} tone="brand" icon="R$" />
          <MetricCard label="Linhas Ativas" value={Number(summary.active || 0)} tone="success" icon="📱" />
          <MetricCard label="Aguardando" value={Number(summary.waiting || 0)} tone="warning" icon="⏳" />
          <MetricCard label="Inativas" value={Number(summary.inactive || 0)} tone="neutral" icon="❌" />
        </section>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '36px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: '200px', maxWidth: '280px' }}>
            <span className="si" style={{ paddingLeft: '12px', display: 'flex', alignItems: 'center' }}>🔍</span>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Buscar por número..." 
              value={tempSearch} 
              onChange={e => setTempSearch(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') setSearch(tempSearch); }}
              style={{ width: "100%", paddingLeft: "36px" }}
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
                className="input" 
                style={{ height: '36px', padding: '0 8px', minWidth: '120px', fontSize: '13px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', flex: '1 1 120px' }}
                value={tempCategory} 
                onChange={e => setTempCategory(e.target.value)}
              >
                <option value="">Categoria: Todas</option>
                <option value="fixo">Fixo</option>
                <option value="celular">Celular</option>
                <option value="celular_voip">Celular VoIP</option>
              </select>
              <select 
                className="input" 
                style={{ height: '36px', padding: '0 8px', minWidth: '120px', fontSize: '13px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', flex: '1 1 120px' }}
                value={tempStatus} 
                onChange={e => setTempStatus(e.target.value)}
              >
                <option value="">Status: Todos</option>
                <option value="ativo">Ativo</option>
                <option value="aguardando_ativacao">Aguardando</option>
                <option value="inativo">Inativo</option>
              </select>
              <select 
                className="input" 
                style={{ height: '36px', padding: '0 8px', minWidth: '120px', fontSize: '13px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', flex: '1 1 120px' }}
                value={tempTeam} 
                onChange={e => setTempTeam(e.target.value)}
              >
                <option value="">Time: Todos</option>
                <option value="Sem time">Sem time</option>
                {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select 
                className="input" 
                style={{ height: '36px', padding: '0 8px', minWidth: '120px', fontSize: '13px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', flex: '1 1 120px' }}
                value={tempSector} 
                onChange={e => setTempSector(e.target.value)}
              >
                <option value="">Setor: Todos</option>
                <option value="Sem setor">Sem setor</option>
                {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
              <button 
                type="button" 
                className="btn btn--outline btn--sm text-danger" 
                onClick={() => {
                  setTempSearch("");
                  setSearch("");
                  setTempCategory("");
                  setCategory("");
                  setTempStatus("");
                  setStatus("");
                  setTempTeam("");
                  setTeam("");
                  setTempSector("");
                  setSector("");
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
                  setCategory(tempCategory);
                  setStatus(tempStatus);
                  setTeam(tempTeam);
                  setSector(tempSector);
                }}
              >
                Filtrar
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && <div className="p-8 text-center text-muted">Carregando dados...</div>}
      {error && <div className="p-8 text-center text-danger">{error}</div>}
      
      {!loading && !error && filteredData.length === 0 ? (
        <EmptyState icon="📱" title="Nenhuma linha encontrada" description="Ajuste os filtros ou crie uma nova linha." />
      ) : (!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Time / Setor</th>
                <th style={{ textAlign: "right" }}>Custo / Mês</th>
                {canManage && <th style={{ textAlign: "right", width: "80px" }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr key={item.id} className="clickable-row" onClick={() => canManage && setSelectedItem(item) && setIsModalOpen(true)}>
                  <td>
                    <div className="table-title">{item.display_number}</div>
                    <div className="table-subtitle font-mono">{item.normalized_number}</div>
                  </td>
                  <td className="capitalize">{item.category.replace('_', ' ')}</td>
                  <td>
                    <StatusPill 
                      status={item.status === 'ativo' ? 'success' : item.status === 'inativo' ? 'neutral' : 'warning'} 
                      label={item.status.replace('_', ' ')} 
                    />
                  </td>
                  <td>{item.responsible_name || "—"}</td>
                  <td>
                    <div className="table-title">{item.team_name || "—"}</div>
                    {item.sector && <div className="table-subtitle">{item.sector}</div>}
                  </td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(Number(item.monthly_fee || 0))}</td>
                  {canManage && (
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsModalOpen(true); }}>
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {isModalOpen && (
        <TelephonyModal
          item={selectedItem}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => { setIsModalOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}
