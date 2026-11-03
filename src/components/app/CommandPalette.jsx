import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";

const BASE_COMMANDS = [
  { id: "page-home", label: "Ir para Início", description: "Página inicial e atalhos", page: "home", icon: "🏠" },
  { id: "page-dashboard", label: "Ir para Visão Geral", description: "Dashboard executivo", page: "dashboard", icon: "📊" },
  { id: "page-clients", label: "Ir para Clientes", description: "Base de clientes e integrações", page: "clients", icon: "👥" },
  { id: "page-docs", label: "Ir para Documentos", description: "Base de conhecimento", page: "docs", icon: "📖" },
  { id: "page-telephony", label: "Ir para Telefonia", description: "Linhas, responsáveis e custos", page: "telephony", icon: "☎️", adminOnly: true },
  { id: "page-flows", label: "Ir para Modelos de Fluxos", description: "Criação guiada de automações", page: "flows", icon: "⚡", adminOnly: true },
  { id: "page-alerts", label: "Ir para Alertas", description: "Falhas e eventos da operação", page: "alerts", icon: "🔔", adminOnly: true },
  { id: "page-users", label: "Ir para Usuários", description: "Acessos, perfis e bloqueios", page: "users", icon: "👤", adminOnly: true },
  { id: "page-control", label: "Ir para Área de Controle", description: "Ferramentas, acessos e financeiro", page: "control", icon: "🔐", adminOnly: true },
  { id: "page-settings", label: "Ir para Configurações", description: "Estrutura organizacional", page: "settings", icon: "⚙️", adminOnly: true },
  { id: "page-help", label: "Abrir Ajuda & Suporte", description: "Manual do sistema e canais de suporte", page: "help", icon: "❓" },
  { id: "page-about", label: "Ir para Sobre Nós", description: "Cultura, Brio e princípios operacionais", page: "about", icon: "✨" },
  { id: "page-profile", label: "Abrir Minha Conta", description: "Perfil do usuário", page: "profile", icon: "👤" },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function CommandPalette({ open, onClose, onNavigate, isAdmin }) {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [docs, setDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [telephony, setTelephony] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setLoading(true);
    const requests = [
      api.getClients(),
      api.getAutomations(),
      api.getDocs(),
      isAdmin ? api.getUsers() : Promise.resolve([]),
      isAdmin ? api.getTelephony({ limit: 250 }) : Promise.resolve({ data: [] }),
      isAdmin ? api.getAdminFlowTemplates() : Promise.resolve([]),
    ];
    Promise.allSettled(requests)
      .then(([clientRes, automationRes, docsRes, usersRes, telephonyRes, flowsRes]) => {
        if (!alive) return;
        if (clientRes.status === "fulfilled") setClients(Array.isArray(clientRes.value) ? clientRes.value : []);
        if (automationRes.status === "fulfilled") setAutomations(Array.isArray(automationRes.value) ? automationRes.value : []);
        if (docsRes.status === "fulfilled") setDocs(Array.isArray(docsRes.value) ? docsRes.value : []);
        if (usersRes?.status === "fulfilled") setUsers(Array.isArray(usersRes.value) ? usersRes.value : []);
        if (telephonyRes?.status === "fulfilled") setTelephony(Array.isArray(telephonyRes.value?.data) ? telephonyRes.value.data : []);
        if (flowsRes?.status === "fulfilled") setFlows(Array.isArray(flowsRes.value) ? flowsRes.value : []);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, isAdmin]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const commands = useMemo(() => {
    const adminCommands = isAdmin ? [
      { id: "action-sync", label: "Sincronizar automações", description: "Executa o sync existente de n8n/Typebot", action: "sync", icon: "🔄" },
    ] : [];

    const clientCommands = clients.slice(0, 40).map((client) => ({
      id: `client-${client.id}`,
      label: client.name,
      description: `${client.company || "Cliente"} · ${client.totalWorkflows || 0} automações · ${client.totalTypebots || 0} typebots`,
      page: "clients",
      clientId: client.id,
      icon: "👥",
    }));

    const automationCommands = automations.slice(0, 40).map((automation) => ({
      id: `automation-${automation.id}`,
      label: automation.name,
      description: `${automation.clientName || automation.owner || "Automação"} · ${automation.status || "sem status"}`,
      page: "clients",
      clientName: automation.clientName || automation.owner,
      icon: "⚡",
    }));

    const docCommands = docs.slice(0, 60).map((doc) => ({
      id: `doc-${doc.id}`,
      label: doc.title || "Documento sem título",
      description: `Documento · ${(doc.tags || []).join(", ") || doc.category || "Base de conhecimento"}`,
      page: "docs",
      docId: doc.id,
      icon: "📄",
    }));

    const userCommands = users.slice(0, 60).map((user) => ({
      id: `user-${user.id}`,
      label: user.name || user.email,
      description: `${user.email} · ${user.teamName || "Sem squad"} · ${user.active ? "Ativo" : "Bloqueado"}`,
      page: "users",
      userSearch: user.email || user.name,
      icon: "👤",
    }));

    const telephonyCommands = telephony.slice(0, 80).map((line) => ({
      id: `telephony-${line.id}`,
      label: line.display_number || line.normalized_number,
      description: `${line.responsible_name || "Sem responsável"} · ${line.team_name || line.sector || "Telefonia"}`,
      page: "telephony",
      telephonySearch: line.normalized_number || line.display_number,
      icon: "☎️",
    }));

    const flowCommands = flows.slice(0, 50).map((flow) => ({
      id: `flow-${flow.id}`,
      label: flow.name,
      description: `Modelo de fluxo · ${flow.category || (flow.is_active ? "Ativo" : "Inativo")}`,
      page: "flows",
      icon: "⚡",
    }));

    return [...BASE_COMMANDS.filter(item => !item.adminOnly || isAdmin), ...adminCommands, ...clientCommands, ...automationCommands, ...docCommands, ...userCommands, ...telephonyCommands, ...flowCommands];
  }, [automations, clients, docs, flows, isAdmin, telephony, users]);

  const filtered = useMemo(() => {
    const term = normalize(query);
    if (!term) return commands.filter(item => item.id.startsWith("page-") || item.action).slice(0, 14);
    return commands
      .filter((item) => normalize(`${item.label} ${item.description}`).includes(term))
      .slice(0, 22);
  }, [commands, query]);

  const runCommand = async (command) => {
    if (command.action === "sync") {
      setSyncing(true);
      try {
        await api.syncAutomations();
        alert("Sincronização solicitada com sucesso.");
      } catch (error) {
        alert(error.message || "Não foi possível iniciar o sync.");
      } finally {
        setSyncing(false);
      }
      return;
    }

    if (command.clientId) {
      localStorage.setItem("techhub.openClientId", String(command.clientId));
    }
    if (command.clientName) {
      localStorage.setItem("techhub.clientSearch", String(command.clientName));
    }
    if (command.docId) localStorage.setItem("techhub.openDocId", String(command.docId));
    if (command.userSearch) localStorage.setItem("techhub.userSearch", String(command.userSearch));
    if (command.telephonySearch) localStorage.setItem("techhub.telephonySearch", String(command.telephonySearch));
    onNavigate(command.page);
    if (command.clientId) window.dispatchEvent(new CustomEvent("techhub.clientSelected", { detail: command.clientId }));
    if (command.clientName) window.dispatchEvent(new CustomEvent("techhub.clientSearch", { detail: command.clientName }));
    if (command.docId) window.dispatchEvent(new CustomEvent("techhub.openDoc", { detail: command.docId }));
    if (command.userSearch) window.dispatchEvent(new CustomEvent("techhub.userSearch", { detail: command.userSearch }));
    if (command.telephonySearch) window.dispatchEvent(new CustomEvent("techhub.telephonySearch", { detail: command.telephonySearch }));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="command-overlay" onMouseDown={onClose}>
      <div className="command-palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-search">
          <Icons.Search />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar páginas, clientes, documentos, usuários ou telefonia..."
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-list">
          {loading ? (
            <div className="command-empty">Indexando o sistema...</div>
          ) : filtered.length === 0 ? (
            <div className="command-empty">Nenhum resultado encontrado.</div>
          ) : (
            filtered.map((command) => (
              <button key={command.id} type="button" className="command-item" onClick={() => runCommand(command)} disabled={syncing && command.action === "sync"}>
                <span className="command-item__icon">{command.icon}</span>
                <span className="command-item__body">
                  <strong>{command.action === "sync" && syncing ? "Sincronizando..." : command.label}</strong>
                  <small>{command.description}</small>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
