import { useState, useEffect } from "react";
import { api } from "../../services/api";

export function TelephonyModal({ 
  item, 
  onClose, 
  onSuccess, 
  canManage = true,
  isSuperAdmin = false,
  teams = [],
  sectors = []
}) {
  const [formData, setFormData] = useState({
    normalized_number: "",
    display_number: "",
    category: "celular",
    routing: "",
    monthly_fee: "",
    status: "ativo",
    responsible_name: "",
    sector: "",
    team_name: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (item) {
      setFormData({
        normalized_number: item.normalized_number || "",
        display_number: item.display_number || "",
        category: item.category || "celular",
        routing: item.routing || "",
        monthly_fee: item.monthly_fee !== null && item.monthly_fee !== undefined ? String(item.monthly_fee) : "",
        status: item.status || "ativo",
        responsible_name: item.responsible_name || "",
        sector: item.sector || "",
        team_name: item.team_name || "",
        notes: item.notes || ""
      });
    }
  }, [item]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };

      // Se o usuário estiver preenchendo o número normalizado e o display_number ainda estiver vazio,
      // sugerir uma máscara amigável para facilitar
      if (name === "normalized_number" && (!prev.display_number || prev.display_number === prev.normalized_number)) {
        const digits = value.replace(/\D/g, "");
        if (digits.length === 13 && digits.startsWith("55")) {
          // +55 (DD) 9XXXX-XXXX
          const ddd = digits.slice(2, 4);
          const p1 = digits.slice(4, 9);
          const p2 = digits.slice(9, 13);
          next.display_number = `(${ddd}) ${p1}-${p2}`;
        } else if (digits.length === 12 && digits.startsWith("55")) {
          // +55 (DD) XXXX-XXXX (fixo)
          const ddd = digits.slice(2, 4);
          const p1 = digits.slice(4, 8);
          const p2 = digits.slice(8, 12);
          next.display_number = `(${ddd}) ${p1}-${p2}`;
        } else if (digits.length === 11) {
          const ddd = digits.slice(0, 2);
          const p1 = digits.slice(2, 7);
          const p2 = digits.slice(7, 11);
          next.display_number = `(${ddd}) ${p1}-${p2}`;
        } else if (digits.length === 10) {
          const ddd = digits.slice(0, 2);
          const p1 = digits.slice(2, 6);
          const p2 = digits.slice(6, 10);
          next.display_number = `(${ddd}) ${p1}-${p2}`;
        }
      }

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        normalized_number: formData.normalized_number.trim(),
        display_number: formData.display_number.trim(),
        category: formData.category,
        status: formData.status,
        routing: formData.routing.trim() || null,
        monthly_fee: formData.monthly_fee ? Number(formData.monthly_fee) : 0,
        responsible_name: formData.responsible_name.trim() || null,
        sector: formData.sector.trim() || null,
        team_name: formData.team_name.trim() || null,
        notes: formData.notes.trim() || null
      };

      if (item) {
        await api.updateTelephony(item.id, payload);
      } else {
        await api.createTelephony(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || "Erro ao salvar linha de telefonia.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmText = item.display_number || item.normalized_number;
    if (!window.confirm(`Deseja realmente excluir a linha "${confirmText}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.deleteTelephony(item.id);
      onSuccess();
    } catch (err) {
      setError(err.message || "Erro ao remover linha de telefonia.");
      setLoading(false);
    }
  };

  return (
    <div className="doc-overlay" onClick={onClose}>
      <div 
        className="doc-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '680px', 
          width: '94%', 
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--r-2xl)',
          overflow: 'hidden',
          boxShadow: 'var(--sh-lg)'
        }}
      >
        {/* Cabeçalho do Pop-up */}
        <div 
          className="doc-modal__header"
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--v4-100)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0
            }}>
              📱
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                {item ? "Editar Linha de Telefonia" : "Nova Linha de Telefonia"}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                {item ? `Altere os dados da linha ${item.display_number || item.normalized_number}` : "Cadastre uma nova linha fixa, celular ou VoIP da operação"}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="doc-modal__close" 
            onClick={onClose}
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Corpo do Formulário */}
        <div className="doc-modal__body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              borderRadius: 'var(--r-md)',
              background: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              border: '1px solid var(--v4-200)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <form id="telephonyForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Datalists para autocompletar sugestões */}
            <datalist id="telephony-teams-list">
              {teams.map(t => <option key={t} value={t} />)}
            </datalist>
            <datalist id="telephony-sectors-list">
              {sectors.map(s => <option key={s} value={s} />)}
            </datalist>

            {/* Bloco 1: Identificação */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>1. Identificação da Linha</span>
              </div>
              <div className="g2">
                <div>
                  <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                    Número Normalizado (E.164) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    name="normalized_number" 
                    className="editor-sidebar__input" 
                    placeholder="+5511999998888" 
                    required 
                    value={formData.normalized_number} 
                    onChange={handleChange} 
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Formato internacional único (DDI + DDD + número)
                  </span>
                </div>

                <div>
                  <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                    Número de Exibição <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    name="display_number" 
                    className="editor-sidebar__input" 
                    placeholder="(11) 99999-8888" 
                    required 
                    value={formData.display_number} 
                    onChange={handleChange} 
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Como o número será exibido na listagem
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Categoria & Status */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-primary)', marginBottom: '12px' }}>
                2. Classificação & Situação
              </div>
              <div className="g2">
                <div>
                  <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                    Categoria <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select 
                    name="category" 
                    className="editor-sidebar__select" 
                    required 
                    value={formData.category} 
                    onChange={handleChange}
                  >
                    <option value="celular">📱 Celular</option>
                    <option value="fixo">☎️ Fixo</option>
                    <option value="celular_voip">🌐 Celular VoIP</option>
                  </select>
                </div>

                <div>
                  <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                    Status Operacional <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select 
                    name="status" 
                    className="editor-sidebar__select" 
                    required 
                    value={formData.status} 
                    onChange={handleChange} 
                  >
                    <option value="ativo">🟢 Ativo</option>
                    <option value="aguardando_ativacao">🟡 Aguardando Ativação</option>
                    <option value="inativo">🔴 Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bloco 3: Atribuição & Custos */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-primary)', marginBottom: '12px' }}>
                3. Alocação & Custo
              </div>
              <div className="g2" style={{ marginBottom: '14px' }}>
                <div>
                  <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                    Responsável
                  </label>
                  <input 
                    type="text" 
                    name="responsible_name" 
                    className="editor-sidebar__input" 
                    placeholder="Nome do colaborador alocado" 
                    value={formData.responsible_name} 
                    onChange={handleChange} 
                  />
                </div>

                <div>
                  <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                    Custo Mensal (R$)
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    name="monthly_fee" 
                    className="editor-sidebar__input" 
                    placeholder="0.00" 
                    value={formData.monthly_fee} 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              <div className="g2">
                <div>
                  <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                    Time / Squad
                  </label>
                  <input 
                    type="text" 
                    name="team_name" 
                    list="telephony-teams-list"
                    className="editor-sidebar__input" 
                    placeholder="Selecione ou digite o time" 
                    value={formData.team_name} 
                    onChange={handleChange} 
                  />
                </div>

                <div>
                  <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                    Setor
                  </label>
                  <input 
                    type="text" 
                    name="sector" 
                    list="telephony-sectors-list"
                    className="editor-sidebar__input" 
                    placeholder="Selecione ou digite o setor" 
                    value={formData.sector} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
            </div>

            {/* Bloco 4: Roteamento & Notas */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-primary)', marginBottom: '12px' }}>
                4. Roteamento Técnico & Observações
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                  Roteamento / Ramal
                </label>
                <input 
                  type="text" 
                  name="routing" 
                  className="editor-sidebar__input" 
                  placeholder="Ex: URA V4 -> Fila Comercial -> Ramal 102" 
                  value={formData.routing} 
                  onChange={handleChange} 
                />
              </div>

              <div>
                <label className="editor-sidebar__label" style={{ display: 'block', marginBottom: '6px' }}>
                  Observações Internas
                </label>
                <textarea 
                  name="notes" 
                  className="editor-sidebar__input" 
                  style={{ minHeight: '74px', resize: 'vertical' }}
                  placeholder="Informações sobre chip ICCID, plano, operadora ou notas de alocação..." 
                  value={formData.notes} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </form>
        </div>

        {/* Rodapé de Ações */}
        <div 
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div>
            {item && canManage && (
              <button 
                type="button" 
                className="btn btn--outline btn--sm" 
                onClick={handleDelete} 
                disabled={loading}
                style={{ 
                  color: 'var(--danger)', 
                  borderColor: 'rgba(233,46,48,0.25)',
                  backgroundColor: 'transparent',
                  gap: '6px'
                }}
              >
                🗑️ Excluir Linha
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn--ghost" 
              onClick={onClose} 
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              form="telephonyForm" 
              className="btn btn--primary" 
              disabled={loading}
              style={{ minWidth: '130px' }}
            >
              {loading ? "Salvando..." : (item ? "Salvar Alterações" : "Cadastrar Linha")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
