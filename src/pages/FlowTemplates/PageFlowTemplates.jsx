import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";
import { FlowTemplateModal } from "./FlowTemplateModal";
import { FlowExecutionModal } from "./FlowExecutionModal";
import { ClientFlowForm } from "./ClientFlowForm";
import { GuidedFlowBuilder } from "./GuidedFlowBuilder";

const ENTRY_OPTIONS = [
  { id: "client", label: "Cadastrar um cliente", description: "Criar o cadastro e deixar tudo pronto", Icon: Icons.Users, accent: "violet" },
  { id: "meta", label: "Organizar leads de anúncios", description: "Levar contatos da Meta para o lugar certo", Icon: Icons.Target, accent: "blue" },
  { id: "lp", label: "Organizar leads de uma página", description: "Levar contatos do site para o lugar certo", Icon: Icons.MousePointer, accent: "green" },
];

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function readEntryFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("tipo");
  return ENTRY_OPTIONS.some(entry => entry.id === requested) ? requested : "client";
}

export default function PageFlowTemplates({ permissions = [], session = null, setPage }) {
  const [activeEntry, setActiveEntry] = useState(readEntryFromUrl);
  const [showLibrary, setShowLibrary] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState(null);
  const [selectedTemplateForRun, setSelectedTemplateForRun] = useState(null);
  const [runContext, setRunContext] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const canManage = permissions.includes("flows.manage") || permissions.includes("*");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [templateResult, docsResult] = await Promise.allSettled([
      canManage ? api.getAdminFlowTemplates() : api.getFlowTemplates(),
      api.getDocs(),
    ]);
    if (templateResult.status === "fulfilled") {
      setTemplates(templateResult.value || []);
      setError(null);
    } else setError(templateResult.reason?.message || "Erro ao carregar modelos de fluxos.");
    if (docsResult.status === "fulfilled") setDocs(docsResult.value || []);
    setLoading(false);
  }, [canManage]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleResetPage = event => {
      if (event.detail !== "flows") return;
      setActiveEntry(readEntryFromUrl());
      setShowLibrary(false);
      setIsEditModalOpen(false);
      setIsRunModalOpen(false);
      setRunContext(null);
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const activeTemplates = useMemo(() => templates.filter(template => template.is_active), [templates]);
  const inactiveTemplates = useMemo(() => templates.filter(template => !template.is_active), [templates]);

  const chooseEntry = id => {
    setActiveEntry(id);
    setShowLibrary(false);
    setFeedback(null);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("tipo", id);
    window.history.replaceState(window.history.state, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  };

  const openGuide = title => {
    const terms = normalize(title).split(/\s+/).filter(term => term.length > 3);
    const guide = docs.find(doc => {
      const searchable = normalize(`${doc.title} ${(doc.tags || []).join(" ")} ${doc.category || ""}`);
      return terms.length > 0 && terms.filter(term => searchable.includes(term)).length >= Math.min(2, terms.length);
    });
    if (!guide) {
      setFeedback({ type: "info", text: `O guia “${title}” ainda não foi publicado. O atalho já está preparado para vinculá-lo assim que o documento for criado.` });
      return;
    }
    localStorage.setItem("techhub.openDocId", String(guide.id));
    setPage("docs");
    window.dispatchEvent(new CustomEvent("techhub.openDoc", { detail: guide.id }));
  };

  return (
    <div className="flow-hub">
      {feedback && <div className={`flow-feedback flow-feedback--${feedback.type}`} role="status"><Icons.Info /><span>{feedback.text}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Fechar aviso">×</button></div>}

      <header className="flow-hub__header">
        <div><span>Modelos de fluxos</span><h1>{showLibrary ? "Gerenciar modelos" : "O que você quer resolver?"}</h1><p>{showLibrary ? "Configurações disponíveis somente para a equipe técnica." : "Escolha uma opção. Vamos pedir apenas o necessário."}</p></div>
        {canManage && <button type="button" className="flow-admin-button" onClick={() => setShowLibrary(current => !current)}><Icons.Settings />{showLibrary ? "Voltar para criação" : "Gerenciar modelos"}</button>}
      </header>

      {!showLibrary && (
        <nav className="flow-entry-grid" aria-label="Escolha o que você quer fazer">
          {ENTRY_OPTIONS.map(entry => {
            const EntryIcon = entry.Icon;
            const isActive = activeEntry === entry.id;
            return (
              <button key={entry.id} type="button" onClick={() => chooseEntry(entry.id)} className={`${isActive ? "is-active" : ""} is-${entry.accent}`} aria-pressed={isActive}>
                <span className="flow-entry-grid__icon"><EntryIcon /></span>
                <div><strong>{entry.label}</strong><small>{entry.description}</small></div>
                <i aria-hidden="true">{isActive ? <Icons.CheckCircle /> : <Icons.ChevronRight />}</i>
              </button>
            );
          })}
        </nav>
      )}

      {showLibrary ? (
        <section className="flow-library">
          <div className="flow-library__heading"><div><span>Administração</span><h2>Biblioteca técnica</h2><p>Webhooks, schemas e disponibilidade dos modelos publicados.</p></div><button type="button" className="btn btn--primary" onClick={() => { setSelectedTemplateForEdit(null); setIsEditModalOpen(true); }}>＋ Novo modelo</button></div>
          {loading && <div className="flow-library__empty">Carregando modelos...</div>}
          {error && <div className="flow-library__empty text-danger">{error}</div>}
          {!loading && !error && templates.length === 0 && <div className="flow-library__empty"><Icons.Zap /><strong>Nenhum modelo publicado</strong><span>Crie o primeiro webhook parametrizado para disponibilizá-lo no assistente.</span></div>}
          {!loading && !error && templates.length > 0 && (
            <div className="flow-library__grid">
              {[...activeTemplates, ...inactiveTemplates].map(template => (
                <article key={template.id} className={!template.is_active ? "is-inactive" : ""}>
                  <div className="flow-library__card-top"><span>{template.category || "Geral"}</span><i>{template.is_active ? "Ativo" : "Inativo"}</i></div>
                  <h3>{template.name}</h3><p>{template.description || "Sem descrição."}</p>
                  <div><button type="button" className="btn btn--primary btn--sm" disabled={!template.is_active} onClick={() => { setRunContext(null); setSelectedTemplateForRun(template); setIsRunModalOpen(true); }}>Usar modelo</button><button type="button" className="btn btn--outline btn--sm" onClick={() => { setSelectedTemplateForEdit(template); setIsEditModalOpen(true); }}>Editar</button></div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : activeEntry === "client" ? (
        <section className="flow-client-entry">
          <ClientFlowForm defaultResponsible={session?.user?.name || ""} onOpenGuide={() => openGuide("Cadastro de novo cliente e automações iniciais")} />
        </section>
      ) : (
        <GuidedFlowBuilder key={activeEntry} source={activeEntry} templates={activeTemplates} loading={loading} onUseTemplate={(template, context) => { setRunContext(context); setSelectedTemplateForRun(template); setIsRunModalOpen(true); }} onOpenGuide={openGuide} />
      )}

      {isEditModalOpen && <FlowTemplateModal template={selectedTemplateForEdit} onClose={() => setIsEditModalOpen(false)} onSuccess={() => { setIsEditModalOpen(false); loadData(); }} />}
      {isRunModalOpen && <FlowExecutionModal template={selectedTemplateForRun} initialContext={runContext} onClose={() => setIsRunModalOpen(false)} />}
    </div>
  );
}
