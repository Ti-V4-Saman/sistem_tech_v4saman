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
  const [status, setStatus] = useState("");
  const [team, setTeam] = useState("");
  const [sector, setSector] = useState("");
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
        setStatus("");
        setTeam("");
        setSector("");
        setShowFilters(false);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const canManage = permissions.includes("telephony.manage") || permissions.includes("*");
  const canExport = permissions.includes("telephony.export") || permissions.includes("*");
  const isSuperAdmin = permissions.includes("*");

  const [metadataTeams, setMetadataTeams] = useState([]);
  const [metadataSectors, setMetadataSectors] = useState([]);

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
    api.getUserMetadata()
      .then(meta => {
        if (meta) {
          if (Array.isArray(meta.teams)) {
            setMetadataTeams(meta.teams.map(t => t.name || t.slug).filter(Boolean));
          }
          if (Array.isArray(meta.areas)) {
            setMetadataSectors(meta.areas.map(a => a.name || a.slug).filter(Boolean));
          }
        }
      })
      .catch(() => {});
  }, [loadData]);

  const uniqueTeams = useMemo(() => {
    const map = new Map();
    metadataTeams.forEach(t => {
      if (t) map.set(t.trim().toLowerCase(), t.trim());
    });
    data.forEach(item => {
      if (item.team_name && !map.has(item.team_name.trim().toLowerCase())) {
        map.set(item.team_name.trim().toLowerCase(), item.team_name.trim());
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [metadataTeams, data]);

  const uniqueSectors = useMemo(() => {
    const map = new Map();
    metadataSectors.forEach(s => {
      if (s) map.set(s.trim().toLowerCase(), s.trim());
    });
    data.forEach(item => {
      if (item.sector && !map.has(item.sector.trim().toLowerCase())) {
        map.set(item.sector.trim().toLowerCase(), item.sector.trim());
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [metadataSectors, data]);

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
      const matchesTeam = !team || (team === "Sem time" ? !item.team_name : (item.team_name && item.team_name.trim().toLowerCase() === team.trim().toLowerCase()));
      const matchesSector = !sector || (sector === "Sem setor" ? !item.sector : (item.sector && item.sector.trim().toLowerCase() === sector.trim().toLowerCase()));
      
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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (category) count++;
    if (status) count++;
    if (team) count++;
    if (sector) count++;
    return count;
  }, [category, status, team, sector]);

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

  const handleToggleStatus = async (item) => {
    try {
      const newStatus = item.status === 'ativo' ? 'inativo' : 'ativo';
      await api.updateTelephony(item.id, { ...item, status: newStatus });
      loadData();
    } catch (err) {
      alert("Erro ao alterar status: " + err.message);
    }
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

      {/* Barra de Busca e Filtros Horizontais */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', marginBottom: '20px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}>
        <div className="search-wrap" style={{ flex: showFilters ? '0 0 220px' : '0 1 320px', minWidth: '180px', transition: 'all 0.2s ease' }}>
          <span className="si" style={{ paddingLeft: '12px', display: 'flex', alignItems: 'center' }}>🔍</span>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por número..." 
            value={tempSearch} 
            onChange={e => {
              setTempSearch(e.target.value);
              if (e.target.value === "") setSearch("");
            }} 
            onKeyDown={(e) => { if (e.key === 'Enter') setSearch(tempSearch); }}
            style={{ width: "100%", height: "36px", paddingLeft: "36px" }}
          />
        </div>

        <button 
          type="button" 
          className="btn btn--primary btn--sm" 
          onClick={() => setSearch(tempSearch)}
          style={{ gap: '6px', height: '36px', flexShrink: 0 }}
        >
          Pesquisar
        </button>

        <button 
          type="button" 
          className={`btn ${showFilters ? 'btn--primary' : 'btn--outline'} btn--sm`} 
          onClick={() => setShowFilters(!showFilters)}
          style={{ gap: '6px', alignItems: 'center', display: 'inline-flex', height: '36px', flexShrink: 0 }}
        >
          <span>Filtros Avançados</span>
          {activeFiltersCount > 0 && (
            <span style={{
              background: showFilters ? 'rgba(255,255,255,0.35)' : 'var(--color-primary)',
              color: '#fff',
              borderRadius: '999px',
              padding: '1px 6px',
              fontSize: '11px',
              fontWeight: '700',
              lineHeight: '14px'
            }}>
              {activeFiltersCount}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="filters-inline-float" style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <select 
              className="editor-sidebar__select select--sm"
              style={{ flex: 1, minWidth: '120px', height: '36px' }}
              value={category} 
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">Categoria: Todas</option>
              <option value="fixo">☎️ Fixo</option>
              <option value="celular">📱 Celular</option>
              <option value="celular_voip">🌐 Celular VoIP</option>
            </select>

            <select 
              className="editor-sidebar__select select--sm"
              style={{ flex: 1, minWidth: '120px', height: '36px' }}
              value={status} 
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">Status: Todos</option>
              <option value="ativo">🟢 Ativo</option>
              <option value="aguardando_ativacao">🟡 Aguardando</option>
              <option value="inativo">🔴 Inativo</option>
            </select>

            <select 
              className="editor-sidebar__select select--sm"
              style={{ flex: 1, minWidth: '120px', height: '36px' }}
              value={team} 
              onChange={e => setTeam(e.target.value)}
            >
              <option value="">Time: Todos</option>
              <option value="Sem time">Sem time</option>
              {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select 
              className="editor-sidebar__select select--sm"
              style={{ flex: 1, minWidth: '120px', height: '36px' }}
              value={sector} 
              onChange={e => setSector(e.target.value)}
            >
              <option value="">Setor: Todos</option>
              <option value="Sem setor">Sem setor</option>
              {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {(category || status || team || sector || search) && (
              <button 
                type="button" 
                className="btn btn--outline btn--sm text-danger" 
                onClick={() => {
                  setTempSearch("");
                  setSearch("");
                  setCategory("");
                  setStatus("");
                  setTeam("");
                  setSector("");
                }}
                style={{ gap: '6px', color: 'var(--danger)', borderColor: 'rgba(233,46,48,0.2)', height: '36px', flexShrink: 0 }}
              >
                ✕ Limpar
              </button>
            )}
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
                <th style={{ whiteSpace: "nowrap" }}>Número</th>
                <th style={{ whiteSpace: "nowrap" }}>Categoria</th>
                <th style={{ whiteSpace: "nowrap" }}>Status</th>
                <th style={{ whiteSpace: "nowrap" }}>Responsável</th>
                <th style={{ whiteSpace: "nowrap" }}>Time / Setor</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Custo / Mês</th>
                {canManage && <th style={{ textAlign: "right", whiteSpace: "nowrap", width: "190px" }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr 
                  key={item.id} 
                  className="clickable-row" 
                  onClick={() => {
                    if (canManage) {
                      setSelectedItem(item);
                      setIsModalOpen(true);
                    }
                  }}
                >
                  <td style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                    <div className="table-title">{item.display_number}</div>
                    <div className="table-subtitle font-mono">{item.normalized_number}</div>
                  </td>
                  <td className="capitalize" style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>{item.category.replace('_', ' ')}</td>
                  <td style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                    <StatusPill 
                      status={item.status === 'ativo' ? 'success' : item.status === 'inativo' ? 'neutral' : 'warning'} 
                      label={item.status.replace('_', ' ')} 
                    />
                  </td>
                  <td style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>{item.responsible_name || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                    <div className="table-title">{item.team_name || "—"}</div>
                    {item.sector && <div className="table-subtitle">{item.sector}</div>}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap", verticalAlign: "middle" }}>{formatCurrency(Number(item.monthly_fee || 0))}</td>
                  {canManage && (
                    <td style={{ textAlign: "right", whiteSpace: "nowrap", verticalAlign: "middle", width: "190px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", flexWrap: "nowrap" }}>
                        <button 
                          type="button"
                          className="btn btn--ghost btn--sm" 
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(item); }}
                          title={item.status === 'ativo' ? 'Desativar linha' : 'Ativar linha'}
                          style={{ whiteSpace: "nowrap", flexShrink: 0, height: "30px", padding: "4px 10px", fontSize: "12px" }}
                        >
                          {item.status === 'ativo' ? 'Desativar' : 'Ativar'}
                        </button>
                        <button 
                          type="button"
                          className="btn btn--outline btn--sm" 
                          onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsModalOpen(true); }}
                          style={{ whiteSpace: "nowrap", flexShrink: 0, height: "30px", padding: "4px 10px", fontSize: "12px" }}
                        >
                          Editar
                        </button>
                      </div>
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
          canManage={canManage}
          isSuperAdmin={isSuperAdmin}
          teams={uniqueTeams}
          sectors={uniqueSectors}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => { setIsModalOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}
