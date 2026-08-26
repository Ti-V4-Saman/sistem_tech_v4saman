import { useState, useEffect } from "react";
import { api } from "../../services/api";

export function FlowExecutionModal({ template, onClose }) {
  const [formData, setFormData] = useState({});
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

  useEffect(() => {
    api.getClients().then(setClients).catch(console.error);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.executeFlowTemplate(template.id, formData, selectedClient || null, idempotencyKey);
      setSuccessMsg("Fluxo disparado com sucesso! Acompanhe o status no Histórico de Execuções.");
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      setError(err.message || "Erro ao executar o fluxo.");
    } finally {
      setLoading(false);
    }
  };

  const schema = template?.form_schema?.fields || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">{template.name}</h2>
            <p className="text-sm text-muted">{template.description}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {error && <div className="p-3 mb-4 text-sm text-danger bg-danger/10 rounded">{error}</div>}
          {successMsg && <div className="p-3 mb-4 text-sm text-success bg-success/10 rounded">{successMsg}</div>}
          
          <form id="executionForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group mb-6">
              <label className="label">Cliente Relacionado (Opcional)</label>
              <select className="input w-full" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <h3 className="text-sm font-semibold border-b border-border pb-2 mb-4">Parâmetros do Fluxo</h3>
            
            {schema.length === 0 ? (
              <p className="text-muted text-sm">Este fluxo não possui parâmetros e pode ser executado diretamente.</p>
            ) : (
              schema.map((field, idx) => {
                if (field.type === "textarea") {
                  return (
                    <div key={idx} className="form-group">
                      <label className="label">{field.label} {field.required && "*"}</label>
                      <textarea
                        name={field.name}
                        className="input w-full min-h-[100px]"
                        required={field.required}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                      />
                    </div>
                  );
                }
                
                if (field.type === "checkbox") {
                  return (
                    <div key={idx} className="form-group flex items-center gap-2">
                      <input
                        type="checkbox"
                        name={field.name}
                        required={field.required}
                        checked={formData[field.name] || false}
                        onChange={handleChange}
                      />
                      <label className="label !mb-0">{field.label} {field.required && "*"}</label>
                    </div>
                  );
                }

                if (field.type === "select" && field.options) {
                  return (
                    <div key={idx} className="form-group">
                      <label className="label">{field.label} {field.required && "*"}</label>
                      <select
                        name={field.name}
                        className="input w-full"
                        required={field.required}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                      >
                        <option value="">Selecione...</option>
                        {field.options.map((opt, oIdx) => (
                          <option key={oIdx} value={opt.value || opt}>{opt.label || opt}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                // Default fallback to text input (text, email, number, url)
                return (
                  <div key={idx} className="form-group">
                    <label className="label">{field.label} {field.required && "*"}</label>
                    <input
                      type={field.type || "text"}
                      name={field.name}
                      className="input w-full"
                      required={field.required}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                    />
                  </div>
                );
              })
            )}
          </form>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/5">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" form="executionForm" className="btn btn--primary" disabled={loading}>
            {loading ? "Processando..." : "Executar Fluxo"}
          </button>
        </div>
      </div>
    </div>
  );
}
