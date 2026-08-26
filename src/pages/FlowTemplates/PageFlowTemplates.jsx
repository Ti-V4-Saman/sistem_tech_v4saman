import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusPill } from "../../components/ui/StatusPill";
import { FlowTemplateModal } from "./FlowTemplateModal";
import { FlowExecutionModal } from "./FlowExecutionModal";

export default function PageFlowTemplates({ permissions = [] }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState(null);
  const [selectedTemplateForRun, setSelectedTemplateForRun] = useState(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  const canManage = permissions.includes("flows.manage") || permissions.includes("*");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = canManage ? await api.getAdminFlowTemplates() : await api.getFlowTemplates();
      setTemplates(res || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Erro ao carregar templates de fluxos.");
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "flows") {
        setIsEditModalOpen(false);
        setIsRunModalOpen(false);
        setSelectedTemplateForEdit(null);
        setSelectedTemplateForRun(null);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const activeTemplates = templates.filter(t => t.is_active);
  const inactiveTemplates = templates.filter(t => !t.is_active);

  return (
    <div className="page-layout">
      <SectionHeader
        title="Modelos de Fluxos"
        description="Templates padronizados para criação de fluxos de atendimento, envios e configurações de sistema."
        right={
          canManage && (
            <button className="btn btn--primary" onClick={() => { setSelectedTemplateForEdit(null); setIsEditModalOpen(true); }}>
              Novo Template
            </button>
          )
        }
      />

      {loading && <div className="p-8 text-center text-muted">Carregando modelos...</div>}
      {error && <div className="p-8 text-center text-danger">{error}</div>}
      
      {!loading && !error && templates.length === 0 ? (
        <EmptyState icon="⚡" title="Nenhum template cadastrado" description="Os templates permitem que sua equipe inicie automações parametrizadas através de formulários padronizados." />
      ) : (!loading && !error && (
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Templates Disponíveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTemplates.map(template => (
                <div key={template.id} className="card p-4 hover:border-primary transition-colors flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-base truncate pr-2">{template.name}</h4>
                    <span className="text-xs font-mono text-muted bg-muted/10 px-2 py-0.5 rounded">{template.category || "Geral"}</span>
                  </div>
                  <p className="text-sm text-muted mb-4 flex-1 line-clamp-3">{template.description}</p>
                  
                  <div className="flex gap-2 mt-auto pt-4 border-t border-border">
                    <button className="btn btn--primary flex-1" onClick={() => { setSelectedTemplateForRun(template); setIsRunModalOpen(true); }}>
                      Usar Template
                    </button>
                    {canManage && (
                      <button className="btn btn--secondary" onClick={() => { setSelectedTemplateForEdit(template); setIsEditModalOpen(true); }}>
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {activeTemplates.length === 0 && <div className="col-span-full text-muted text-sm py-4">Nenhum template ativo disponível.</div>}
            </div>
          </div>

          {canManage && inactiveTemplates.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Templates Inativos (Apenas Admins)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 grayscale hover:grayscale-0 transition-all">
                {inactiveTemplates.map(template => (
                  <div key={template.id} className="card p-4 flex flex-col h-full bg-surface">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-base truncate pr-2">{template.name}</h4>
                      <StatusPill status="neutral" label="Inativo" />
                    </div>
                    <p className="text-sm text-muted mb-4 flex-1">{template.description}</p>
                    
                    <div className="flex gap-2 mt-auto pt-4 border-t border-border">
                      <button className="btn btn--secondary flex-1" onClick={() => { setSelectedTemplateForEdit(template); setIsEditModalOpen(true); }}>
                        Editar Configurações
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {isEditModalOpen && (
        <FlowTemplateModal
          template={selectedTemplateForEdit}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => { setIsEditModalOpen(false); loadData(); }}
        />
      )}

      {isRunModalOpen && (
        <FlowExecutionModal
          template={selectedTemplateForRun}
          onClose={() => setIsRunModalOpen(false)}
        />
      )}
    </div>
  );
}
