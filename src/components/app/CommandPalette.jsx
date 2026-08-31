import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";

const BASE_COMMANDS = [
  { id: "page-home", label: "Ir para Início", description: "Página inicial e atalhos", page: "home", icon: "🏠" },
  { id: "page-dashboard", label: "Ir para Visão Geral", description: "Dashboard executivo", page: "dashboard", icon: "📊" },
  { id: "page-clients", label: "Ir para Clientes", description: "Base de clientes e integrações", page: "clients", icon: "👥" },
  { id: "page-docs", label: "Ir para Documentos", description: "Base de conhecimento", page: "docs", icon: "📖" },
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
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setLoading(true);
    Promise.allSettled([api.getClients(), api.getAutomations()])
      .then(([clientRes, automationRes]) => {
        if (!alive) return;
        if (clientRes.status === "fulfilled") setClients(Array.isArray(clientRes.value) ? clientRes.value : []);
        if (automationRes.status === "fulfilled") setAutomations(Array.isArray(automationRes.value) ? automationRes.value : []);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open]);

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
      { id: "page-users", label: "Ir para Usuários", description: "Gestão de usuários", page: "users", icon: "🔐" },
      { id: "page-settings", label: "Ir para Administrativa", description: "Configurações internas", page: "settings", icon: "⚙️" },
      { id: "page-help", label: "Abrir Suporte", description: "FAQ e abertura de ticket", page: "help", icon: "❓" },
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

    return [...BASE_COMMANDS, ...adminCommands, ...clientCommands, ...automationCommands];
  }, [automations, clients, isAdmin]);

  const filtered = useMemo(() => {
    const term = normalize(query);
    if (!term) return commands.slice(0, 14);
    return commands
      .filter((item) => normalize(`${item.label} ${item.description}`).includes(term))
      .slice(0, 16);
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
      window.dispatchEvent(new CustomEvent("techhub.clientSelected", { detail: command.clientId }));
    }
    if (command.clientName) {
      localStorage.setItem("techhub.clientSearch", String(command.clientName));
      window.dispatchEvent(new CustomEvent("techhub.clientSearch", { detail: command.clientName }));
    }
    onNavigate(command.page);
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
            placeholder="Buscar cliente, automação ou página..."
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-list">
          {loading ? (
            <div className="command-empty">Carregando atalhos internos...</div>
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
