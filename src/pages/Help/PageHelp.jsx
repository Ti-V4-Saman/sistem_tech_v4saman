import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";

const GUIDES = [
  {
    id: "clients", title: "Clientes e integrações", icon: "👥", keywords: "clientes n8n typebot v4chat automações credenciais",
    summary: "Encontre dados, automações, bots, instâncias e acessos centralizados por cliente.",
    steps: ["Abra Clientes no menu lateral.", "Use a busca para localizar a empresa.", "Selecione uma integração para consultar status, execuções ou acessos."],
  },
  {
    id: "docs", title: "Criar e importar documentos", icon: "📄", keywords: "documento pdf docx importar editar publicar tags",
    summary: "Crie documentos do zero, use templates ou importe arquivos PDF e DOCX.",
    steps: ["Abra Documentos e clique em Novo documento ou Importar DOCX/PDF.", "Revise o conteúdo extraído e ajuste título, categoria e tags.", "Salve como rascunho ou publique quando estiver pronto."],
  },
  {
    id: "phone", title: "Gerenciar telefonia", icon: "☎️", keywords: "telefone telefonia linha csv importar editar custo status",
    summary: "Cadastre, edite, importe e acompanhe linhas fixas, celulares e VoIP.",
    steps: ["Abra Telefonia e use Nova linha para cadastro individual.", "Para importação em lote, utilize um CSV com os cabeçalhos do modelo.", "Clique em uma linha para editar responsável, status, custo, time e roteamento."],
  },
  {
    id: "access", title: "Usuários e acesso", icon: "🔐", keywords: "usuário acesso bloquear desbloquear perfil squad permissões",
    summary: "Gerencie cadastro, perfil organizacional e bloqueio de acesso.",
    steps: ["Abra Usuários na área administrativa.", "Use o lápis para editar o cadastro e o perfil.", "Use o cadeado para bloquear ou desbloquear imediatamente o acesso."],
  },
  {
    id: "alerts", title: "Alertas e falhas", icon: "🔔", keywords: "alertas falha erro urgente resolver incidente",
    summary: "Priorize falhas operacionais e acompanhe o histórico de eventos.",
    steps: ["Abra Alertas e filtre por urgência.", "Consulte os eventos para entender a origem.", "Registre a resolução para manter o histórico operacional."],
  },
];

export default function PageHelp({ setPage, session }) {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState([]);
  const [ticket, setTicket] = useState({ clientId: "", title: "", description: "", type: "support", priority: "medium" });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const permissions = session?.permissions || [];
  const isAdmin = ["admin", "super-admin"].includes(session?.user?.accessRoleSlug);
  const canCreateTicket = permissions.includes("tickets.create") || permissions.includes("*");

  useEffect(() => {
    if (!canCreateTicket) return;
    api.getClients().then(setClients).catch(() => setClients([]));
  }, [canCreateTicket]);

  const visibleGuides = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return GUIDES;
    return GUIDES.filter(guide => `${guide.title} ${guide.summary} ${guide.keywords}`.toLowerCase().includes(term));
  }, [query]);

  const submitTicket = async (event) => {
    event.preventDefault();
    setMessage(null);
    setSending(true);
    try {
      await api.createTicket(ticket);
      setTicket({ clientId: "", title: "", description: "", type: "support", priority: "medium" });
      setMessage({ type: "success", text: "Chamado aberto. A equipe poderá acompanhar a solicitação pelo histórico." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Não foi possível abrir o chamado." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="support-page">
      <section className="support-hero">
        <div className="support-hero__eyebrow">Ajuda & Suporte</div>
        <h1>Como podemos ajudar?</h1>
        <p>Encontre instruções por tarefa ou abra uma solicitação para o time responsável.</p>
        <label className="support-search"><Icons.Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por importação, telefonia, usuários, alertas..." />{query && <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca">✕</button>}</label>
      </section>

      <nav className="support-shortcuts" aria-label="Atalhos de ajuda">
        <button type="button" onClick={() => setPage("docs")}><span><Icons.Doc /></span><div><strong>Documentos</strong><small>Criar, importar e publicar</small></div></button>
        <button type="button" onClick={() => setPage("clients")}><span><Icons.Users /></span><div><strong>Clientes</strong><small>Integrações e acessos</small></div></button>
        {isAdmin && <button type="button" onClick={() => setPage("telephony")}><span><Icons.Phone /></span><div><strong>Telefonia</strong><small>Linhas e importação CSV</small></div></button>}
        {isAdmin && <button type="button" onClick={() => setPage("users")}><span><Icons.Shield /></span><div><strong>Controle de acesso</strong><small>Usuários e bloqueios</small></div></button>}
      </nav>

      <div className="support-layout">
        <section className="support-guides">
          <div className="support-section-heading"><div><span>Guias rápidos</span><h2>Resolva tarefas frequentes</h2></div><small>{visibleGuides.length} tópicos</small></div>
          <div className="support-guide-list">
            {visibleGuides.length === 0 ? (
              <div className="support-empty"><Icons.Search /><strong>Nenhum guia encontrado</strong><span>Tente buscar por outro termo.</span></div>
            ) : visibleGuides.map((guide, index) => (
              <details className="support-guide" key={guide.id} open={!query && index === 0}>
                <summary><span className="support-guide__icon">{guide.icon}</span><div><strong>{guide.title}</strong><small>{guide.summary}</small></div><Icons.ChevronDown /></summary>
                <ol>{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
              </details>
            ))}
          </div>
        </section>

        <aside className="support-contact">
          <div className="support-contact__header"><span><Icons.HelpCircle /></span><div><h2>Precisa de ajuda?</h2><p>Abra um chamado com contexto suficiente para agilizar o atendimento.</p></div></div>
          {canCreateTicket ? (
            <form onSubmit={submitTicket} className="support-ticket-form">
              {message && <div className={`form-message form-message--${message.type === "success" ? "success" : "danger"}`}>{message.text}</div>}
              <div><label>Cliente relacionado *</label><select required value={ticket.clientId} onChange={event => setTicket(current => ({ ...current, clientId: event.target.value }))}><option value="">Selecione o cliente...</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
              <div className="g2"><div><label>Tipo</label><select value={ticket.type} onChange={event => setTicket(current => ({ ...current, type: event.target.value }))}><option value="support">Suporte</option><option value="incident">Incidente</option><option value="request">Solicitação</option></select></div><div><label>Prioridade</label><select value={ticket.priority} onChange={event => setTicket(current => ({ ...current, priority: event.target.value }))}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div></div>
              <div><label>Assunto *</label><input required value={ticket.title} onChange={event => setTicket(current => ({ ...current, title: event.target.value }))} placeholder="Resuma o que precisa ser resolvido" /></div>
              <div><label>Descrição *</label><textarea required value={ticket.description} onChange={event => setTicket(current => ({ ...current, description: event.target.value }))} placeholder="Descreva o cenário, resultado esperado e mensagens de erro..." /></div>
              <button type="submit" className="btn btn--primary" disabled={sending}>{sending ? "Enviando..." : "Abrir chamado"}</button>
            </form>
          ) : (
            <div className="support-no-permission"><Icons.Lock /><strong>Abertura de chamados indisponível</strong><p>Seu perfil não possui a permissão necessária. Procure um administrador.</p></div>
          )}
          <div className="support-contact__tip"><Icons.Lightbulb /><span>Inclua cliente, tela, horário e mensagem de erro para acelerar o diagnóstico.</span></div>
        </aside>
      </div>
    </div>
  );
}
