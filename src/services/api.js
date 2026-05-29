import { CLIENTS_DATA, AUTOMATIONS_DATA, INSTANCES_DATA, USERS_DATA, GROWTH_DATA, TOOLS_ADOPTION, STATUS_PIE } from "../data";

// Utilitário para simular o tempo de resposta de um banco de dados real
const delay = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * SERVIÇOS DE API
 * Substitua o interior destas funções pelas suas chamadas reais ao banco (ex: Supabase)
 * ou backend (ex: Axios / fetch).
 */
export const api = {
  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------
  getDashboardData: async () => {
    // Tenta puxar dados reais do nosso micro-backend Node (n8n)
    let realData = null;
    try {
      const res = await fetch("http://localhost:3000/api/dashboard");
      if (res.ok) {
        realData = await res.json();
      }
    } catch (e) {
      console.warn("Backend do n8n não está rodando. Usando dados mockados para clientes/automações...");
    }

    // Se o backend retornou, usamos os valores reais. Caso contrário, usamos o fallback.
    const activeClients = realData ? realData.activeClients : CLIENTS_DATA.filter(c => c.status === "active").length;
    const activeAutomations = realData ? realData.activeAutomations : AUTOMATIONS_DATA.filter(a => a.status === "active").length;
    
    // Instâncias (Chatwoot) e Bots (Typebot) ainda mantemos mockados ou baseados no backend
    const activeInstances = INSTANCES_DATA.filter(i => i.status === "active").length;
    const activeBots = realData && realData.activeBots !== undefined ? realData.activeBots : AUTOMATIONS_DATA.filter(a => a.type === "Typebot" && a.status === "active").length;

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonth = new Date().getMonth();
    
    const dynamicGrowthData = GROWTH_DATA.map((item, index) => {
      const mIndex = (currentMonth - 5 + index + 12) % 12;
      const factor = (index + 1) / 6; 
      return { 
        mes: monthNames[mIndex],
        clientes: Math.max(0, Math.round(activeClients * factor)),
        automacoes: Math.max(0, Math.round(activeAutomations * factor)),
        instancias: Math.max(0, Math.round(activeInstances * factor)),
        bots: Math.max(0, Math.round(activeBots * factor))
      };
    });

    // Retorna os gráficos pré-calculados do backend (se disponíveis)
    const charts = {
      growthData: dynamicGrowthData
    };

    return {
      metrics: {
        activeClients,
        activeAutomations,
        activeInstances,
        activeBots
      },
      charts,
      recentClients: CLIENTS_DATA.slice(0, 5)
    };
  },

  // ---------------------------------------------------------------------------
  // CLIENTES
  // ---------------------------------------------------------------------------
  getClients: async () => {
    try {
      const res = await fetch("http://localhost:3000/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        return data.clientsDetail;
      }
    } catch(e) {}
    // Fallback se o servidor não estiver rodando
    await delay();
    return CLIENTS_DATA;
  },

  getClientDetails: async (clientId) => {
    try {
      const res = await fetch("http://localhost:3000/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        const client = data.clientsDetail.find(c => c.id === clientId);
        if (client) {
          // Transformamos os workflows do banco no formato que o frontend espera
          const automations = client.workflows.map(w => {
            const execs = w.executions || [];
            const lastExec = execs.length > 0 ? execs[0] : null;

            let derivedStatus = w.is_active ? "active" : "inactive";
            if (w.is_active && lastExec && lastExec.status === "error") {
              derivedStatus = "error";
            }
            
            return {
              id: w.workflow_id,
              name: w.workflow_name,
              type: "n8n",
              status: derivedStatus,
              owner: "n8n (auto)",
              updatedAt: lastExec ? `Última exc: ${lastExec.status}` : "Recente",
              executions: execs.reverse() // ordem cronológica para os quadrados da UI
            };
          });

          // Processamos os typebots que vieram do banco
          const typebots = (client.typebots || []).map(t => ({
             id: t.id,
             name: t.name,
             type: "Typebot",
             status: t.status,
             owner: "Admin",
             updatedAt: t.status === 'active' ? "Publicado" : "Rascunho",
             url: t.url
          }));

          return { ...client, automations, typebots, instances: [] };
        }
      }
    } catch(e) {}
    
    // Fallback
    await delay();
    const client = CLIENTS_DATA.find(c => c.id === clientId);
    if (!client) return null;
    
    const automations = AUTOMATIONS_DATA.filter(a => a.clientId === clientId);
    const instances = INSTANCES_DATA.filter(i => i.clientId === clientId);
    return { ...client, automations, instances };
  },

  // ---------------------------------------------------------------------------
  // AUTOMAÇÕES (n8n, Typebot, etc)
  // ---------------------------------------------------------------------------
  getAutomations: async () => {
    await delay();
    return AUTOMATIONS_DATA;
  },

  // ---------------------------------------------------------------------------
  // INSTÂNCIAS (Chatwoot, Z-API, Evolution, etc)
  // ---------------------------------------------------------------------------
  getInstances: async () => {
    await delay();
    return INSTANCES_DATA;
  }
};
