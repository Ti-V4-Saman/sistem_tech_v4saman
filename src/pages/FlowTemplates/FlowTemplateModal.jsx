import { useState, useEffect } from "react";
import { api } from "../../services/api";

const DEFAULT_SCHEMA = {
  fields: [
    { name: "nome_cliente", label: "Nome do Cliente", type: "text", required: true },
    { name: "mensagem", label: "Mensagem Padrão", type: "textarea", required: false }
  ]
};

export function FlowTemplateModal({ template, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    category: "",
    webhook_url: "",
    is_active: true,
    display_order: 0
  });
  
  const [schemaText, setSchemaText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || "",
        slug: template.slug || "",
        description: template.description || "",
        category: template.category || "",
        webhook_url: template.webhook_url || "",
        is_active: template.is_active ?? true,
        display_order: template.display_order || 0
      });
      setSchemaText(template.form_schema ? JSON.stringify(template.form_schema, null, 2) : JSON.stringify(DEFAULT_SCHEMA, null, 2));
    } else {
      setSchemaText(JSON.stringify(DEFAULT_SCHEMA, null, 2));
    }
  }, [template]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    let parsedSchema = null;
    try {
      parsedSchema = JSON.parse(schemaText);
      if (!parsedSchema || typeof parsedSchema !== "object" || !Array.isArray(parsedSchema.fields)) {
        throw new Error("O schema deve conter um array 'fields'. Ex: { \"fields\": [...] }");
      }
    } catch (err) {
      setError("Erro no Form Schema (JSON inválido ou formato incorreto): " + err.message);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        display_order: Number(formData.display_order),
        form_schema: parsedSchema
      };

      if (template) {
        await api.updateFlowTemplate(template.id, payload);
      } else {
        await api.createFlowTemplate(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || "Erro ao salvar template.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doc-overlay" onMouseDown={onClose}>
      <div className="doc-modal flow-modal" onMouseDown={event => event.stopPropagation()}>
        <div className="doc-modal__header">
          <div>
            <span className="doc-modal__eyebrow">Modelos de fluxo</span>
            <h2 className="doc-modal__title">{template ? "Editar template" : "Novo template"}</h2>
          </div>
          <button type="button" onClick={onClose} className="doc-modal__close" aria-label="Fechar modal">✕</button>
        </div>
        
        <div className="doc-modal__body flow-modal__body">
          {error && <div className="form-message form-message--danger" role="alert">{error}</div>}
          
          <form id="templateForm" onSubmit={handleSubmit} className="flow-form">
            <div className="g2">
              <div className="form-group">
                <label>Nome do template *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="editor-sidebar__input"
                  required 
                  value={formData.name} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label>Slug (identificador único) *</label>
                <input 
                  type="text" 
                  name="slug" 
                  className="editor-sidebar__input input--mono"
                  required 
                  value={formData.slug} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <input 
                type="text" 
                name="description" 
                className="editor-sidebar__input"
                value={formData.description} 
                onChange={handleChange} 
              />
            </div>

            <div className="flow-form__triple">
              <div className="form-group">
                <label>Categoria</label>
                <input 
                  type="text" 
                  name="category" 
                  className="editor-sidebar__input"
                  placeholder="Ex: Integrações" 
                  value={formData.category} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label>Ordem de exibição</label>
                <input 
                  type="number" 
                  name="display_order" 
                  className="editor-sidebar__input"
                  value={formData.display_order} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group form-group--checkbox">
                <label className="checkbox-field">
                  <input 
                    type="checkbox" 
                    name="is_active" 
                    checked={formData.is_active} 
                    onChange={handleChange} 
                  />
                  <span>Template Ativo</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>URL do webhook (n8n) *</label>
              <input 
                type="url" 
                name="webhook_url" 
                className="editor-sidebar__input input--mono"
                placeholder="https://n8n.exemplo.com/webhook/..." 
                required 
                value={formData.webhook_url} 
                onChange={handleChange} 
              />
              <p className="field-helper">A URL receberá um POST JSON com os campos do formulário.</p>
            </div>

            <div className="form-group">
              <label>Form schema (JSON) *</label>
              <textarea 
                className="editor-sidebar__input input--mono flow-schema-input"
                required 
                value={schemaText} 
                onChange={e => setSchemaText(e.target.value)} 
              />
              <p className="field-helper">Formato: <code>{`{ "fields": [ { "name": "campo", "label": "Título", "type": "text" } ] }`}</code></p>
            </div>
          </form>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" form="templateForm" className="btn btn--primary" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
