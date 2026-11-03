import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function createPrefill(template, context) {
  if (!context) return {};
  return (template?.form_schema?.fields || []).reduce((values, field) => {
    const key = normalize(`${field.name} ${field.label}`);
    if (key.includes("cliente") && context.client) values[field.name] = context.client;
    else if ((key.includes("formulario") || key.includes("pagina") || key.includes("landing") || key.includes("url")) && context.assetName) values[field.name] = context.assetName;
    else if ((key.includes("planilha") || key.includes("sheet") || key.includes("whatsapp") || key.includes("grupo") || key.includes("caixa")) && context.connectionValue) values[field.name] = context.connectionValue;
    return values;
  }, {});
}

export function FlowExecutionModal({ template, initialContext = null, onClose }) {
  const [formData, setFormData] = useState(() => createPrefill(template, initialContext));
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

  useEffect(() => {
    api.getClients().then(items => {
      setClients(items);
      if (!initialContext?.client) return;
      const wanted = normalize(initialContext.client);
      const match = items.find(client => normalize(client.name) === wanted) || items.find(client => normalize(client.name).includes(wanted) || wanted.includes(normalize(client.name)));
      if (match) setSelectedClient(String(match.id));
    }).catch(console.error);
  }, [initialContext]);

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
      setSuccessMsg("Automação criada com sucesso.");
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      setError(err.message || "Erro ao executar o fluxo.");
    } finally {
      setLoading(false);
    }
  };

  const schema = template?.form_schema?.fields || [];

  return (
    <div className="doc-overlay" onMouseDown={onClose}>
      <div className="doc-modal flow-modal flow-modal--execution" onMouseDown={event => event.stopPropagation()}>
        <div className="doc-modal__header">
          <div>
            <span className="doc-modal__eyebrow">Último passo</span>
            <h2 className="doc-modal__title">Revise os dados</h2>
            <p className="doc-modal__description">Confira e clique em “Criar automação”.</p>
          </div>
          <button type="button" onClick={onClose} className="doc-modal__close" aria-label="Fechar modal">✕</button>
        </div>
        
        <div className="doc-modal__body flow-modal__body">
          {error && <div className="form-message form-message--danger" role="alert">{error}</div>}
          {successMsg && <div className="flow-execution-success" role="status"><Icons.CheckCircle /><div><strong>{successMsg}</strong><span>Esta janela fechará automaticamente.</span></div></div>}
          
          {!successMsg && <form id="executionForm" onSubmit={handleSubmit} className="flow-form flow-form--friendly">
            <div className="flow-selected-template"><Icons.Zap /><div><small>Automação escolhida</small><strong>{template.name}</strong></div></div>
            <div className="form-group">
              <label>Vincular a um cliente <small>Opcional</small></label>
              <select className="editor-sidebar__select" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                <option value="">Selecione o cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <h3 className="flow-form__section-title">Informações necessárias</h3>
            
            {schema.length === 0 ? (
              <div className="flow-form__empty flow-form__ready"><Icons.CheckCircle /><span><strong>Tudo certo</strong>Nenhuma informação adicional é necessária.</span></div>
            ) : (
              schema.map((field, idx) => {
                if (field.type === "textarea") {
                  return (
                    <div key={idx} className="form-group">
                      <label>{field.label} {field.required && "*"}</label>
                      <textarea
                        name={field.name}
                        className="editor-sidebar__input flow-textarea"
                        required={field.required}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                      />
                    </div>
                  );
                }
                
                if (field.type === "checkbox") {
                  return (
                    <div key={idx} className="form-group form-group--checkbox">
                      <label className="checkbox-field">
                        <input type="checkbox" name={field.name} required={field.required} checked={formData[field.name] || false} onChange={handleChange} />
                        <span>{field.label} {field.required && "*"}</span>
                      </label>
                    </div>
                  );
                }

                if (field.type === "select" && field.options) {
                  return (
                    <div key={idx} className="form-group">
                      <label>{field.label} {field.required && "*"}</label>
                      <select
                        name={field.name}
                        className="editor-sidebar__select"
                        required={field.required}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                      >
                        <option value="">Selecione uma opção</option>
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
                    <label>{field.label} {field.required && "*"}</label>
                    <input
                      type={field.type || "text"}
                      name={field.name}
                      className="editor-sidebar__input"
                      required={field.required}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                    />
                  </div>
                );
              })
            )}
          </form>}
        </div>

        {!successMsg && <div className="modal-actions">
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={loading}><Icons.ArrowLeft /> Voltar</button>
          <button type="submit" form="executionForm" className="btn btn--primary flow-primary-action" disabled={loading}>
            {loading ? <><span className="flow-button-spinner" /> Criando...</> : <>Criar automação <Icons.ChevronRight /></>}
          </button>
        </div>}
      </div>
    </div>
  );
}
