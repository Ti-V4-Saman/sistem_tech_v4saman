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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold">{template ? "Editar Template de Fluxo" : "Novo Template de Fluxo"}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {error && <div className="p-3 mb-4 text-sm text-danger bg-danger/10 rounded">{error}</div>}
          
          <form id="templateForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Nome do Template*</label>
                <input 
                  type="text" 
                  name="name" 
                  className="input w-full" 
                  required 
                  value={formData.name} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label className="label">Slug (Identificador Único)*</label>
                <input 
                  type="text" 
                  name="slug" 
                  className="input w-full font-mono text-sm" 
                  required 
                  value={formData.slug} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Descrição</label>
              <input 
                type="text" 
                name="description" 
                className="input w-full" 
                value={formData.description} 
                onChange={handleChange} 
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label className="label">Categoria</label>
                <input 
                  type="text" 
                  name="category" 
                  className="input w-full" 
                  placeholder="Ex: Integrações" 
                  value={formData.category} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label className="label">Ordem de Exibição</label>
                <input 
                  type="number" 
                  name="display_order" 
                  className="input w-full" 
                  value={formData.display_order} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
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
              <label className="label">URL do Webhook (n8n)*</label>
              <input 
                type="url" 
                name="webhook_url" 
                className="input w-full font-mono text-sm" 
                placeholder="https://n8n.exemplo.com/webhook/..." 
                required 
                value={formData.webhook_url} 
                onChange={handleChange} 
              />
              <p className="text-xs text-muted mt-1">A URL receberá um POST JSON com os campos do formulário.</p>
            </div>

            <div className="form-group">
              <label className="label">Form Schema (JSON)*</label>
              <textarea 
                className="input w-full font-mono text-sm min-h-[200px]" 
                required 
                value={schemaText} 
                onChange={e => setSchemaText(e.target.value)} 
              />
              <p className="text-xs text-muted mt-1">Formato: <code>{`{ "fields": [ { "name": "campo", "label": "Título", "type": "text" } ] }`}</code></p>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/5">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" form="templateForm" className="btn btn--primary" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
