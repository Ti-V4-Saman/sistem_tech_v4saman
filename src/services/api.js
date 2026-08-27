const delay = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));
const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "techhub.auth";

class ApiError extends Error {
  constructor(message, { status = 0, payload = null, isNetworkError = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.isNetworkError = isNetworkError;
  }
}

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function setStoredSession(session) {
  if (!session) localStorage.removeItem(AUTH_STORAGE_KEY);
  else localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function apiFetch(path, options = {}) {
  const session = getStoredSession();
  const headers = { ...(options.headers || {}) };
  const body = options.body;

  if (body && !(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (session?.accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  try {
    const response = await fetch(buildApiUrl(path), { ...options, headers });

    if (response.status === 401) {
      setStoredSession(null);
    }

    return response;
  } catch (error) {
    throw new ApiError("API indisponível ou sem conexão com o backend.", {
      isNetworkError: true,
      payload: error,
    });
  }
}

async function parseJsonOrThrow(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.error || "Erro na API.", {
      status: response.status,
      payload,
    });
  }

  return payload;
}

async function request(path, options = {}) {
  const response = await apiFetch(path, options);
  return parseJsonOrThrow(response);
}



function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function parseMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === "object") return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseAccesses(notesString) {
  if (!notesString || !notesString.trim()) return [];
  try {
    const parsed = JSON.parse(notesString);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => {
        if (!item || typeof item !== "object") return false;
        if (item.id === "legacy") return false;
        if (item.title && (item.title.includes("Legado") || item.title.includes("Acesso Geral"))) return false;
        return true;
      });
    }
  } catch (e) {
    // plain text system note
  }
  return [];
}

function mapClient(row = {}) {
  const activeWorkflows = Number(row.activeWorkflows ?? row.active_workflows ?? row.active_automations ?? 0);
  const totalWorkflows = Number(row.totalWorkflows ?? row.total_workflows ?? row.total_automations ?? 0);
  const activeTypebots = Number(row.activeTypebots ?? row.active_typebots ?? row.published_bots ?? 0);
  const totalTypebots = Number(row.totalTypebots ?? row.total_typebots ?? row.total_bots ?? 0);
  const accessesCount = row.notes !== undefined ? parseAccesses(row.notes).length : (row.accessesCount ?? 0);

  return {
    ...row,
    id: row.id,
    name: row.name || "Sem nome",
    company: row.company || row.unit || row.legal_name || "",
    fee: row.fee ?? row.fee_amount ?? null,
    healthScore: row.healthScore ?? row.health_score ?? null,
    updatedAt: row.updatedAt || formatDateTime(row.updated_at),
    createdAt: row.createdAt || formatDateTime(row.created_at),
    activeWorkflows,
    totalWorkflows,
    activeTypebots,
    totalTypebots,
    accessesCount,
  };
}

function normalizeExecution(run = {}) {
  const status = String(run.status || run.state || "unknown").toLowerCase();
  return {
    ...run,
    id: run.id || run.external_run_id || run.execution_id || run.runId,
    status,
    startedAt: run.startedAt || formatDateTime(run.started_at || run.startedAt),
    finishedAt: run.finishedAt || formatDateTime(run.finished_at || run.stopped_at || run.finishedAt),
    durationMs: Number(run.duration_ms ?? run.durationMs ?? 0),
  };
}

function mapAutomation(row = {}) {
  const metadata = parseMetadata(row.metadata);
  const executions = row.executions || row.runs || metadata.executions || [];
  const workflowId = row.externalId || row.external_id || metadata.workflow_id || row.id;
  const n8nBaseUrl = (import.meta.env.VITE_N8N_BASE_URL || "https://n8ops.v4saman.com").replace(/\/+$/, "");
  const workflowUrl = workflowId ? `${n8nBaseUrl}/workflow/${workflowId}` : null;

  return {
    ...row,
    id: row.id || row.external_id,
    externalId: workflowId,
    name: row.name || row.workflow_name || "Sem nome",
    type: row.type || row.source || metadata.type || "Automação",
    description: row.description || metadata.description || metadata.tag_name || row.client_name || "",
    owner: row.owner || row.owner_name || row.client_name || "",
    clientName: row.clientName || row.client_name || row.owner_name || "",
    status: row.status || (row.is_active ? "active" : "inactive"),
    isActive: Boolean(row.is_active ?? row.active ?? row.status === "active"),
    workflowUrl,
    updatedAt: row.updatedAt || formatDateTime(row.updated_at),
    executions: Array.isArray(executions) ? executions.map(normalizeExecution) : [],
  };
}

function mapInstance(row = {}) {
  const metadata = parseMetadata(row.metadata);
  const tool = row.tool || row.provider || metadata.tool || (row.is_dispatch ? "Disparo" : "WhatsApp");
  return {
    ...row,
    id: row.id,
    name: row.name || row.instance_name || "Instância sem nome",
    identifier: row.identifier || row.phone_number || metadata.identifier || "",
    phone: row.phone || row.phone_number || row.identifier || "",
    provider: row.provider || tool,
    tool,
    updatedAt: row.updatedAt || formatDateTime(row.updated_at),
    lastConnectedAt: row.lastConnectedAt || formatDateTime(row.last_connected_at),
    lastMessageAt: row.lastMessageAt || formatDateTime(row.last_message_at),
  };
}

function mapBot(row = {}) {
  const metadata = parseMetadata(row.metadata);
  const typebotId = row.external_id || row.externalId || row.id;
  const folderId = metadata.folder_id || metadata.folderId || null;
  const editorBaseUrl = (import.meta.env.VITE_TYPEBOT_EDITOR_URL || "https://builder.v4saman.com").replace(/\/+$/, "");

  const editorUrl = row.editor_url || row.editorUrl || (typebotId ? `${editorBaseUrl}/typebots/${typebotId}/edit` : null);
  const folderUrl = metadata.folder_url || metadata.folderUrl || (folderId ? `${editorBaseUrl}/typebots/folders/${folderId}` : null);

  return {
    ...row,
    id: row.id || row.external_id,
    externalId: typebotId,
    name: row.name || row.typebot_name || "Bot sem nome",
    type: "Typebot",
    status: row.status || (row.is_published ? "active" : "inactive"),
    url: row.url || row.public_url,
    editorUrl,
    folderId,
    folderUrl,
    folderName: metadata.folder_name || metadata.folderName || "",
    updatedAt: row.updatedAt || formatDateTime(row.updated_at),
  };
}

function mapNotification(row = {}) {
  const metadata = parseMetadata(row.metadata);
  return {
    ...row,
    id: row.id,
    title: row.title || "Notificação",
    description: row.description || "",
    type: row.type || "system",
    priority: row.priority || "medium",
    status: row.status || "unread",
    unread: (row.status || "unread") === "unread",
    client: row.client || metadata.client_name || metadata.client || "Sistema",
    occurred_at: formatDateTime(metadata.occurred_at || row.occurred_at || row.created_at),
    createdAt: formatDateTime(row.created_at),
    readAt: formatDateTime(row.read_at),
  };
}

function normalizeClientDetails(detail = {}) {
  const automations = (detail.automations || []).map(mapAutomation);
  const instances = (detail.instances || []).map(mapInstance);
  const bots = (detail.bots || detail.typebots || []).map(mapBot);
  const rawTools = Array.isArray(detail.tools) ? detail.tools : [];

  const toolNames = unique([
    ...rawTools.map(tool => typeof tool === "string" ? tool : (tool.name || tool.tool_name || tool.provider || tool.source)),
    ...automations.map(item => item.type),
    ...instances.map(item => item.tool),
    ...bots.map(() => "Typebot"),
  ]);

  return {
    ...mapClient(detail),
    tools: toolNames,
    automations,
    instances,
    bots,
    typebots: bots,
    docs: detail.docs || [],
    activeWorkflows: automations.filter(item => item.status === "active" || item.is_active).length,
    totalWorkflows: automations.length,
    activeTypebots: bots.filter(item => item.status === "active" || item.is_published).length,
    totalTypebots: bots.length,
  };
}

function mapUser(row = {}) {
  const accessRoleSlug = row.accessRoleSlug || row.access_role_slug || (row.role ? String(row.role).toLowerCase() : "user");
  return {
    ...row,
    accessRoleSlug,
    accessRoleName: row.accessRoleName || row.access_role_name || accessRoleSlug,
    jobRoleSlug: row.jobRoleSlug || row.job_role_slug || "",
    jobRoleName: row.jobRoleName || row.job_role_name || "Sem cargo definido",
    teamSlug: row.teamSlug || row.team_slug || "",
    teamName: row.teamName || row.team_name || "Sem time definido",
    avatarUrl: row.avatarUrl || row.avatar_url || null,
    active: typeof row.active === "boolean" ? row.active : row.status !== "inactive",
    lastLogin: row.lastLogin || formatDateTime(row.last_login_at),
    createdAt: row.createdAt || formatDateTime(row.created_at),
    updatedAt: row.updatedAt || formatDateTime(row.updated_at),
  };
}



export const api = {
  getStoredSession,

  getAuthConfig: async () => {
    return await request("/auth/config");
  },

  loginWithGoogle: async (credential) => {
    const session = await request("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    setStoredSession(session);
    return session;
  },

  loginWithPassword: async ({ email, password }) => {
    const session = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredSession(session);
    return session;
  },

  me: async () => {
    const data = await request("/auth/me");
    const current = getStoredSession();
    const session = { ...(current || {}), ...data };
    setStoredSession(session);
    return session;
  },

  logout: async () => {
    try { await apiFetch("/auth/logout", { method: "POST" }); } catch { }
    setStoredSession(null);
    return true;
  },

  healthcheck: async () => {
    const response = await apiFetch("/healthcheck", { method: "GET" });
    return parseJsonOrThrow(response);
  },

  getDashboardData: async () => {
    const realData = await request("/dashboard/overview");
    const metrics = realData.metrics || {};
    const activeClients = Number(metrics.active_clients || 0);
    const onboardingClients = Number(metrics.onboarding_clients || 0);
    const clientsAtRisk = Number(metrics.clients_at_risk || 0);
    const activeAutomations = Number(metrics.active_automations || 0);
    const totalAutomations = Number(metrics.total_automations || 0);
    const automationsWithError = Number(metrics.automations_with_error || 0);
    const activeInstances = Number(metrics.active_whatsapp_instances || 0);
    const totalInstances = Number(metrics.total_whatsapp_instances || 0);
    const activeBots = Number(metrics.published_bots || 0);
    const totalBots = Number(metrics.total_bots || 0);
    const total_mrr = Number(metrics.total_mrr || 0);
    const open_tickets = Number(metrics.open_tickets || 0);
    const open_incidents = Number(metrics.open_incidents || 0);
    const expired_credentials = Number(metrics.expired_credentials || 0);
    const totalRuns = Number(metrics.total_runs || 0);
    const successfulRuns = Number(metrics.successful_runs || 0);
    const failedRuns = Number(metrics.failed_runs || 0);
    const pendingRuns = Number(metrics.pending_runs || 0);
    const successRate = Number(metrics.success_rate || 0);
    const failureRate = Number(metrics.failure_rate || 0);

    const growthBase = [
      { mes:"Ago", clientes:12, automacoes:8, instancias:4, bots:2 },
      { mes:"Set", clientes:15, automacoes:12, instancias:6, bots:3 },
      { mes:"Out", clientes:20, automacoes:18, instancias:9, bots:4 },
      { mes:"Nov", clientes:25, automacoes:24, instancias:11, bots:6 },
      { mes:"Dez", clientes:32, automacoes:32, instancias:14, bots:8 },
      { mes:"Jan", clientes:38, automacoes:40, instancias:17, bots:11 },
    ];

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonth = new Date().getMonth();
    const dynamicGrowthData = growthBase.map((item, index) => {
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

    return {
      metrics: {
        activeClients,
        onboardingClients,
        clientsAtRisk,
        activeAutomations,
        totalAutomations,
        automationsWithError,
        activeInstances,
        totalInstances,
        activeBots,
        totalBots,
        total_mrr,
        open_tickets,
        open_incidents,
        expired_credentials,
        totalRuns,
        successfulRuns,
        failedRuns,
        pendingRuns,
        successRate,
        failureRate,
      },
      charts: { growthData: dynamicGrowthData },
      recentClients: realData.topClients || [],
      ticketPriority: realData.ticketPriority || [],
      incidentSeverity: realData.incidentSeverity || [],
      healthDistribution: realData.healthDistribution || { healthy: 0, attention: 0, risk: 0, critical: 0 }
    };
  },

  getDashboardAlerts: async () => {
    const res = await request("/dashboard/alerts");
    return (res.data || []).map(a => ({
      type: a.type,
      client: a.client || "Cliente Desconhecido",
      title: a.title || "Alerta",
      occurred_at: formatDateTime(a.occurred_at),
      urgency: a.urgency || "low",
      occurrence_count: a.occurrence_count || 1
    }));
  },

  getNotifications: async () => {
    const res = await request("/notifications");
    return (res.data || []).map(mapNotification);
  },

  markNotificationRead: async (id) => {
    return mapNotification(await request(`/notifications/${id}/read`, { method: "PATCH" }));
  },

  markAllNotificationsRead: async () => {
    await request("/notifications/read-all", { method: "PATCH" });
      return true;
  },

  getClients: async ({ limit = 100, offset = 0 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      const data = await request(`/clients?${params.toString()}`);
      return (data.data || []).map(mapClient);
  },

  createClient: async (client) => {
    return mapClient(await request("/clients", { method: "POST", body: JSON.stringify(client) }));
  },

  getClientDetails: async (clientId) => {
    const detail = await request(`/clients/${clientId}`);
      return normalizeClientDetails(detail);
  },

  syncAutomations: async () => {
    return request("/automations/sync", { method: "POST" });
  },

  updateBotStatus: async (botId, status) => {
    const res = await request(`/automations/bots/${botId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return mapBot(res);
  },

  updateAutomationStatus: async (automationId, status) => {
    const res = await request(`/automations/${automationId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return mapAutomation(res);
  },

  getAutomations: async () => {
    const data = await request("/automations");
      return (data.data || []).map(mapAutomation);
  },

  getInstances: async () => {
    const data = await request("/instances");
      return (data.data || []).map(mapInstance);
  },

  getDocs: async () => {
    const data = await request("/docs");
      return data.data || [];
  },

  getDoc: async (id) => {
    return await request(`/docs/${id}`);
  },

  createDoc: async (doc) => {
    return await request("/docs", { method: "POST", body: JSON.stringify(doc) });
  },

  updateDoc: async (id, changes) => {
    return await request(`/docs/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
  },

  deleteDoc: async (id) => {
    await request(`/docs/${id}`, { method: "DELETE" });
      return true;
  },

  getTags: async () => {
    const data = await request("/docs/tags");
      return data.data || [];
  },

  createTag: async (tag) => {
    return await request("/docs/tags", { method: "POST", body: JSON.stringify(tag) });
  },

  deleteTag: async (id) => {
    await request(`/docs/tags/${id}`, { method: "DELETE" });
      return true;
  },

  getTemplates: async () => {
    const data = await request("/docs/templates");
      return data.data || [];
  },

  getUsers: async () => {
    const data = await request("/users");
      return (data.data || []).map(mapUser);
  },

  getUserMetadata: async () => {
    return await request("/users/metadata");
  },

  updateMyProfile: async (changes) => {
    const data = await request("/users/me/profile", { method: "PATCH", body: JSON.stringify(changes) });
    const current = getStoredSession();
    const session = { ...(current || {}), user: data.user, permissions: data.user?.permissions || current?.permissions || [] };
    setStoredSession(session);
    return session;
  },

  createUser: async (user) => {
    return mapUser(await request("/users", { method: "POST", body: JSON.stringify(user) }));
  },

  updateUser: async (id, changes) => {
    return mapUser(await request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(changes) }));
  },

  deleteUser: async (id) => {
    await request(`/users/${id}`, { method: "DELETE" });
      return true;
  },

  updateClient: async (clientId, client) => {
    const nextClient = await request(`/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify(client),
      });
      return mapClient(nextClient);
  },

  getTickets: async () => {
    const res = await request("/tickets");
      return res.data || [];
  },

  createTicket: async (ticket) => {
    return await request("/tickets", {
        method: "POST",
        body: JSON.stringify(ticket)
      });
  },

  getSettings: async (type) => {
    const res = await request(`/settings/${type}`);
      return res.data || [];
  },

  createSetting: async (type, setting) => {
    return await request(`/settings/${type}`, {
        method: "POST",
        body: JSON.stringify(setting),
      });
  },

  updateSetting: async (type, id, setting) => {
    return await request(`/settings/${type}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(setting),
      });
  },

  deleteSetting: async (type, id) => {
    await request(`/settings/${type}/${id}`, {
      method: "DELETE",
    });
    return true;
  },

  // --- Telephony ---
  getTelephonySummary: async () => {
    return await request("/telephony/summary");
  },

  getTelephony: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return await request(`/telephony?${q}`);
  },

  createTelephony: async (data) => {
    return await request("/telephony", { method: "POST", body: JSON.stringify(data) });
  },

  updateTelephony: async (id, data) => {
    return await request(`/telephony/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteTelephony: async (id) => {
    await request(`/telephony/${id}`, { method: "DELETE" });
    return true;
  },

  // --- Flow Templates ---
  getFlowTemplates: async () => {
    const res = await request("/flow-templates");
    return res.data || [];
  },

  getAdminFlowTemplates: async () => {
    const res = await request("/flow-templates/admin");
    return res.data || [];
  },

  createFlowTemplate: async (data) => {
    return await request("/flow-templates", { method: "POST", body: JSON.stringify(data) });
  },

  updateFlowTemplate: async (id, data) => {
    return await request(`/flow-templates/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  executeFlowTemplate: async (id, payload, client_id, idempotency_key) => {
    return await request(`/flow-templates/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ payload, client_id, idempotency_key }),
    });
  },

  getFlowRequests: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return await request(`/flow-templates/requests?${q}`);
  },

  // --- Alerts ---
  getAlerts: async () => {
    return await request("/alerts");
  },

  getAlertsHistory: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return await request(`/alerts/history?${q}`);
  },

  resolveAlert: async (id, resolution_note) => {
    return await request(`/alerts/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution_note }),
    });
  },

  getAlertPreference: async (type, id) => {
    return await request(`/alerts/preferences/${type}/${id}`);
  },

  updateAlertPreference: async (type, id, enabled) => {
    return await request(`/alerts/preferences/${type}/${id}`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  }
};
