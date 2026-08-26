import { useState, useEffect } from "react";
import { api } from "../../services/api";

export function TelephonyModal({ item, onClose, onSuccess }) {
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
        monthly_fee: item.monthly_fee || "",
        status: item.status || "ativo",
        responsible_name: item.responsible_name || "",
        sector: item.sector || "",
        team_name: item.team_name || "",
        notes: item.notes || ""
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        monthly_fee: formData.monthly_fee ? Number(formData.monthly_fee) : null
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
    if (!window.confirm("Deseja realmente remover esta linha de telefonia? Esta ação não pode ser desfeita.")) return;
    setLoading(true);
    setError(null);
    try {
      await api.deleteTelephony(item.id);
      onSuccess();
    } catch (err) {
      setError(err.message || "Erro ao remover linha.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold">{item ? "Editar Linha de Telefonia" : "Nova Linha de Telefonia"}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {error && <div className="p-3 mb-4 text-sm text-danger bg-danger/10 rounded">{error}</div>}
          
          <form id="telephonyForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Número Normalizado (E.164)*</label>
                <input 
                  type="text" 
                  name="normalized_number" 
                  className="input w-full" 
                  placeholder="+5511999999999" 
                  required 
                  value={formData.normalized_number} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label className="label">Número de Exibição*</label>
                <input 
                  type="text" 
                  name="display_number" 
                  className="input w-full" 
                  placeholder="(11) 99999-9999" 
                  required 
                  value={formData.display_number} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Categoria*</label>
                <select name="category" className="input w-full" required value={formData.category} onChange={handleChange}>
                  <option value="fixo">Fixo</option>
                  <option value="celular">Celular</option>
                  <option value="celular_voip">Celular VoIP</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Status*</label>
                <select name="status" className="input w-full" required value={formData.status} onChange={handleChange}>
                  <option value="ativo">Ativo</option>
                  <option value="aguardando_ativacao">Aguardando Ativação</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Responsável</label>
                <input 
                  type="text" 
                  name="responsible_name" 
                  className="input w-full" 
                  placeholder="Nome do colaborador" 
                  value={formData.responsible_name} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label className="label">Custo Mensal (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="monthly_fee" 
                  className="input w-full" 
                  placeholder="0.00" 
                  value={formData.monthly_fee} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Time</label>
                <input 
                  type="text" 
                  name="team_name" 
                  className="input w-full" 
                  placeholder="Ex: Snipers" 
                  value={formData.team_name} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label className="label">Setor</label>
                <input 
                  type="text" 
                  name="sector" 
                  className="input w-full" 
                  placeholder="Ex: Vendas" 
                  value={formData.sector} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Roteamento / Ramal</label>
              <input 
                type="text" 
                name="routing" 
                className="input w-full" 
                placeholder="Ex: URAs, Filas, Ramais" 
                value={formData.routing} 
                onChange={handleChange} 
              />
            </div>

            <div className="form-group">
              <label className="label">Observações</label>
              <textarea 
                name="notes" 
                className="input w-full min-h-[80px]" 
                placeholder="Notas internas..." 
                value={formData.notes} 
                onChange={handleChange} 
              />
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-border flex justify-between items-center bg-muted/5">
          <div>
            {item && (
              <button type="button" className="text-danger hover:underline text-sm font-medium" onClick={handleDelete} disabled={loading}>
                Excluir linha
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" form="telephonyForm" className="btn btn--primary" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
