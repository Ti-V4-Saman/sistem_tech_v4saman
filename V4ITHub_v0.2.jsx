import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const USERS_DATA = [
  { id: 1, name: "Gabriel Guerra",  email: "gabriel.guerra@v4company.com",  role: "ADMIN", active: true,  lastLogin: "15/01 às 09:32", createdAt: "01/06/2023" },
  { id: 2, name: "Mariana Torres",  email: "mariana.torres@v4company.com",  role: "USER",  active: true,  lastLogin: "15/01 às 08:45", createdAt: "15/07/2023" },
  { id: 3, name: "Ricardo Lima",    email: "ricardo.lima@v4company.com",    role: "USER",  active: true,  lastLogin: "14/01 às 17:20", createdAt: "01/08/2023" },
  { id: 4, name: "Ana Costa",       email: "ana.costa@v4company.com",       role: "ADMIN", active: true,  lastLogin: "15/01 às 10:00", createdAt: "15/06/2023" },
  { id: 5, name: "Pedro Alves",     email: "pedro.alves@v4company.com",     role: "USER",  active: false, lastLogin: "10/01 às 14:00", createdAt: "01/09/2023" },
];

const CLIENTS_DATA = [
  { id: 1,  name: "Acme Corp",      company: "Unidade SP", status: "active",      fee: 4200, owner: "Gabriel G.", tools: ["n8n","V4Chat","Typebot","CRM"],        updatedAt: "há 2h",  createdAt: "15/06/2023", notes: "Cliente principal, alto volume" },
  { id: 2,  name: "Beta Digital",   company: "Unidade RJ", status: "onboarding",  fee: 2800, owner: "Mariana T.", tools: ["n8n","CRM"],                          updatedAt: "há 5h",  createdAt: "10/01/2024", notes: "Em processo de onboarding" },
  { id: 3,  name: "Gamma Leads",    company: "Unidade BH", status: "maintenance", fee: 1500, owner: "Ricardo L.", tools: ["Typebot"],                            updatedAt: "há 1d",  createdAt: "20/09/2023", notes: "Revisão de fluxos em andamento" },
  { id: 4,  name: "Delta Vendas",   company: "Unidade PE", status: "active",      fee: 5600, owner: "Gabriel G.", tools: ["n8n","V4Chat","CRM","Typebot"],        updatedAt: "há 1d",  createdAt: "01/05/2023", notes: "Maior cliente em receita" },
  { id: 5,  name: "Epsilon Pro",    company: "Unidade CE", status: "inactive",    fee: 900,  owner: "Mariana T.", tools: ["CRM"],                                updatedAt: "há 3d",  createdAt: "15/11/2023", notes: "Contrato pausado" },
  { id: 6,  name: "Zeta Mkt",       company: "Unidade RS", status: "active",      fee: 3100, owner: "Ana C.",     tools: ["n8n","Typebot","RD Station"],          updatedAt: "há 2d",  createdAt: "20/07/2023", notes: "" },
  { id: 7,  name: "Eta Commerce",   company: "Unidade PR", status: "active",      fee: 2400, owner: "Ricardo L.", tools: ["V4Chat","CRM"],                       updatedAt: "há 4h",  createdAt: "10/08/2023", notes: "" },
  { id: 8,  name: "Theta Tech",     company: "Unidade SC", status: "onboarding",  fee: 1800, owner: "Gabriel G.", tools: ["n8n"],                                updatedAt: "há 6h",  createdAt: "05/01/2024", notes: "Novo cliente" },
  { id: 9,  name: "Iota Serviços",  company: "Unidade GO", status: "active",      fee: 3800, owner: "Ana C.",     tools: ["n8n","V4Chat","Typebot"],             updatedAt: "há 3h",  createdAt: "15/04/2023", notes: "" },
  { id: 10, name: "Kappa Auto",     company: "Unidade DF", status: "active",      fee: 2100, owner: "Mariana T.", tools: ["Typebot","CRM"],                      updatedAt: "há 1d",  createdAt: "01/10/2023", notes: "" },
  { id: 11, name: "Lambda Edu",     company: "Unidade MG", status: "maintenance", fee: 1200, owner: "Ricardo L.", tools: ["n8n","Typebot"],                      updatedAt: "há 2d",  createdAt: "01/12/2023", notes: "Ajustes em integrações" },
  { id: 12, name: "Mu Saúde",       company: "Unidade SP", status: "active",      fee: 4500, owner: "Gabriel G.", tools: ["n8n","V4Chat","CRM","RD Station"],    updatedAt: "há 5h",  createdAt: "10/03/2023", notes: "" },
  { id: 13, name: "Nu Imóveis",     company: "Unidade RJ", status: "active",      fee: 3300, owner: "Ana C.",     tools: ["n8n","V4Chat","Typebot"],             updatedAt: "há 8h",  createdAt: "25/08/2023", notes: "" },
  { id: 14, name: "Xi Logística",   company: "Unidade PR", status: "inactive",    fee: 1600, owner: "Mariana T.", tools: ["CRM"],                                updatedAt: "há 5d",  createdAt: "20/10/2023", notes: "Em análise de renovação" },
  { id: 15, name: "Omicron Var",    company: "Unidade BA", status: "active",      fee: 2700, owner: "Ricardo L.", tools: ["n8n","Typebot","V4Chat"],             updatedAt: "há 1d",  createdAt: "05/09/2023", notes: "" },
];

const AUTOMATIONS_DATA = [
  { id: 1,  name: "Lead Nurturing - Email",      clientId: 1,  type: "n8n",         status: "active",      owner: "Gabriel G.", updatedAt: "10/01", description: "Fluxo de nutrição integrado ao RD Station" },
  { id: 2,  name: "Bot Qualificação WhatsApp",   clientId: 1,  type: "Typebot",      status: "active",      owner: "Mariana T.", updatedAt: "12/01", description: "Qualificação de leads via WhatsApp" },
  { id: 3,  name: "Sync CRM → n8n",             clientId: 1,  type: "n8n",         status: "error",       owner: "Ricardo L.", updatedAt: "14/01", description: "ERRO: timeout na API do CRM" },
  { id: 4,  name: "Disparo Campanha Mensal",     clientId: 4,  type: "n8n",         status: "active",      owner: "Gabriel G.", updatedAt: "08/01", description: "Disparos mensais via WhatsApp" },
  { id: 5,  name: "Onboarding Bot",             clientId: 4,  type: "Typebot",      status: "active",      owner: "Ana C.",     updatedAt: "05/01", description: "Fluxo de onboarding de novos clientes" },
  { id: 6,  name: "Relatório Semanal Auto",     clientId: 4,  type: "n8n",         status: "development", owner: "Gabriel G.", updatedAt: "15/01", description: "Em desenvolvimento: relatório automático" },
  { id: 7,  name: "Integração RD → CRM",        clientId: 6,  type: "n8n",         status: "active",      owner: "Ricardo L.", updatedAt: "11/01", description: "Integração bidirecional RD Station e CRM" },
  { id: 8,  name: "Bot Suporte Pré-Venda",      clientId: 6,  type: "Typebot",      status: "active",      owner: "Mariana T.", updatedAt: "13/01", description: "Chatbot de suporte para pré-vendas" },
  { id: 9,  name: "Pipeline Vendas Auto",       clientId: 7,  type: "CRM",         status: "active",      owner: "Ana C.",     updatedAt: "09/01", description: "Automação de pipeline de vendas no CRM" },
  { id: 10, name: "Follow-up V4Chat",           clientId: 7,  type: "V4Chat",      status: "active",      owner: "Gabriel G.", updatedAt: "12/01", description: "Follow-up automático via V4Chat" },
  { id: 11, name: "Captura Leads GreatPages",   clientId: 9,  type: "webhook",     status: "active",      owner: "Ricardo L.", updatedAt: "10/01", description: "Webhook de captura do GreatPages" },
  { id: 12, name: "Nutrição Email Sequencial",  clientId: 9,  type: "n8n",         status: "active",      owner: "Mariana T.", updatedAt: "11/01", description: "Sequência de emails de nutrição" },
  { id: 13, name: "Bot Agendamento",            clientId: 9,  type: "Typebot",      status: "maintenance", owner: "Ana C.",     updatedAt: "14/01", description: "Bot de agendamento em manutenção" },
  { id: 14, name: "Disparo Promo Semanal",      clientId: 12, type: "n8n",         status: "active",      owner: "Gabriel G.", updatedAt: "13/01", description: "Disparos promocionais semanais" },
  { id: 15, name: "Integração Planos de Saúde", clientId: 12, type: "integration", status: "active",      owner: "Ricardo L.", updatedAt: "08/01", description: "Integração com sistemas de saúde" },
  { id: 16, name: "CRM Saúde Pipeline",         clientId: 12, type: "CRM",         status: "error",       owner: "Mariana T.", updatedAt: "15/01", description: "ERRO: falha na sincronização de pacientes" },
  { id: 17, name: "Qualificação Imóvel Bot",    clientId: 13, type: "Typebot",      status: "active",      owner: "Ana C.",     updatedAt: "10/01", description: "Qualificação de leads de imóveis" },
  { id: 18, name: "Disparo Lançamento",         clientId: 13, type: "dispatch",    status: "active",      owner: "Gabriel G.", updatedAt: "09/01", description: "Disparos para lançamentos de imóveis" },
  { id: 19, name: "Lead Scoring n8n",           clientId: 15, type: "n8n",         status: "active",      owner: "Mariana T.", updatedAt: "11/01", description: "Pontuação automática de leads" },
  { id: 20, name: "Bot Varejo WhatsApp",        clientId: 15, type: "Typebot",      status: "development", owner: "Ricardo L.", updatedAt: "15/01", description: "Bot em desenvolvimento para varejo" },
  { id: 21, name: "Webhook GreatPages → CRM",   clientId: 10, type: "webhook",     status: "active",      owner: "Ana C.",     updatedAt: "10/01", description: "Captura via GreatPages para CRM" },
  { id: 22, name: "Bot FAQ Lambda",             clientId: 11, type: "Typebot",      status: "maintenance", owner: "Gabriel G.", updatedAt: "13/01", description: "FAQ automatizado em manutenção" },
  { id: 23, name: "Nutrição n8n Lambda",        clientId: 11, type: "n8n",         status: "inactive",    owner: "Mariana T.", updatedAt: "05/01", description: "Fluxo inativo aguardando revisão" },
];

const INSTANCES_DATA = [
  { id: 1,  name: "Acme - Principal",      clientId: 1,  identifier: "+55 11 99001-0001", isV4Chat: true,  isDispatch: false, status: "active",      tool: "V4Chat" },
  { id: 2,  name: "Acme - Disparo",        clientId: 1,  identifier: "+55 11 99001-0002", isV4Chat: false, isDispatch: true,  status: "active",      tool: "n8n" },
  { id: 3,  name: "Acme - Suporte",        clientId: 1,  identifier: "+55 11 99001-0003", isV4Chat: true,  isDispatch: false, status: "active",      tool: "V4Chat" },
  { id: 4,  name: "Beta - WhatsApp",       clientId: 2,  identifier: "+55 21 98002-0001", isV4Chat: false, isDispatch: false, status: "active",      tool: "n8n" },
  { id: 5,  name: "Delta - Principal",     clientId: 4,  identifier: "+55 81 99004-0001", isV4Chat: true,  isDispatch: false, status: "active",      tool: "V4Chat" },
  { id: 6,  name: "Delta - Disparo A",     clientId: 4,  identifier: "+55 81 99004-0002", isV4Chat: false, isDispatch: true,  status: "active",      tool: "n8n" },
  { id: 7,  name: "Delta - Disparo B",     clientId: 4,  identifier: "+55 81 99004-0003", isV4Chat: false, isDispatch: true,  status: "blocked",     tool: "n8n",    notes: "Bloqueada - revisar" },
  { id: 8,  name: "Iota - Atendimento",   clientId: 9,  identifier: "+55 62 99009-0001", isV4Chat: true,  isDispatch: false, status: "active",      tool: "V4Chat" },
  { id: 9,  name: "Iota - Disparo",       clientId: 9,  identifier: "+55 62 99009-0002", isV4Chat: false, isDispatch: true,  status: "active",      tool: "n8n" },
  { id: 10, name: "Mu - Principal",        clientId: 12, identifier: "+55 11 99012-0001", isV4Chat: true,  isDispatch: false, status: "active",      tool: "V4Chat" },
  { id: 11, name: "Mu - Disparo",          clientId: 12, identifier: "+55 11 99012-0002", isV4Chat: false, isDispatch: true,  status: "active",      tool: "n8n" },
  { id: 12, name: "Nu - Atendimento",      clientId: 13, identifier: "+55 21 99013-0001", isV4Chat: true,  isDispatch: false, status: "active",      tool: "V4Chat" },
  { id: 13, name: "Nu - Lançamento",       clientId: 13, identifier: "+55 21 99013-0002", isV4Chat: false, isDispatch: true,  status: "maintenance", tool: "n8n" },
  { id: 14, name: "Omicron - Principal",   clientId: 15, identifier: "+55 71 99015-0001", isV4Chat: true,  isDispatch: false, status: "active",      tool: "V4Chat" },
  { id: 15, name: "Eta - Atendimento",    clientId: 7,  identifier: "+55 41 99007-0001", isV4Chat: true,  isDispatch: false, status: "active",      tool: "V4Chat" },
  { id: 16, name: "Zeta - Bot",            clientId: 6,  identifier: "+55 51 99006-0001", isV4Chat: false, isDispatch: false, status: "active",      tool: "Typebot" },
  { id: 17, name: "Kappa - Atend.",        clientId: 10, identifier: "+55 61 99010-0001", isV4Chat: false, isDispatch: false, status: "inactive",    tool: "Typebot" },
];

const DOCS_DATA = [
  { id: 1,  title: "Como configurar webhook no GreatPages",       category: "Integrações",  area: "TI",      status: "published", author: "Gabriel G.", tags: ["webhook","GreatPages","n8n"],   updatedAt: "há 1h" },
  { id: 2,  title: "Fluxo de disparos via n8n + WhatsApp",        category: "Automações",   area: "Cliente", status: "published", author: "Ricardo L.", tags: ["n8n","WhatsApp","disparo"],     updatedAt: "há 3h" },
  { id: 3,  title: "Configurar token RD Station",                 category: "Ferramentas",  area: "TI",      status: "draft",     author: "Mariana T.", tags: ["RD Station","token","API"],     updatedAt: "há 6h" },
  { id: 4,  title: "Onboarding V4Chat — passo a passo",           category: "V4Chat",       area: "Cliente", status: "published", author: "Gabriel G.", tags: ["V4Chat","onboarding"],          updatedAt: "há 2d" },
  { id: 5,  title: "Como criar fluxo no Typebot",                 category: "Typebot",      area: "TI",      status: "published", author: "Ana C.",     tags: ["Typebot","bot","fluxo"],        updatedAt: "há 3d" },
  { id: 6,  title: "Configuração inicial n8n",                    category: "n8n",          area: "TI",      status: "published", author: "Ricardo L.", tags: ["n8n","configuração"],           updatedAt: "há 4d" },
  { id: 7,  title: "Gestão de instâncias WhatsApp",               category: "Instâncias",   area: "TI",      status: "published", author: "Gabriel G.", tags: ["WhatsApp","instância"],         updatedAt: "há 5d" },
  { id: 8,  title: "Procedimentos de emergência — automações",    category: "Processos",    area: "TI",      status: "published", author: "Ana C.",     tags: ["emergência","erro"],            updatedAt: "há 1sem" },
  { id: 9,  title: "SLA de suporte técnico",                      category: "Processos",    area: "TI",      status: "published", author: "Gabriel G.", tags: ["SLA","suporte"],                updatedAt: "há 2sem" },
  { id: 10, title: "Integração CRM com n8n — guia avançado",      category: "Integrações",  area: "TI",      status: "draft",     author: "Mariana T.", tags: ["CRM","n8n","integração"],      updatedAt: "há 3d" },
  { id: 11, title: "V4Chat Analytics — como usar",                category: "V4Chat",       area: "Cliente", status: "published", author: "Ricardo L.", tags: ["V4Chat","analytics"],           updatedAt: "há 1sem" },
  { id: 12, title: "Configuração de disparos em massa",           category: "Automações",   area: "Cliente", status: "archived",  author: "Ana C.",     tags: ["disparo","massa"],              updatedAt: "há 2mes" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHART DATA
// ═══════════════════════════════════════════════════════════════════════════════

const FEE_MONTHLY = [
  { mes: "Ago", fee: 28400, clientes: 38 },
  { mes: "Set", fee: 31200, clientes: 39 },
  { mes: "Out", fee: 33800, clientes: 40 },
  { mes: "Nov", fee: 36100, clientes: 41 },
  { mes: "Dez", fee: 37500, clientes: 41 },
  { mes: "Jan", fee: 39200, clientes: 42 },
];

const TOOLS_ADOPTION = [
  { tool: "n8n",        clientes: 11 },
  { tool: "Typebot",    clientes: 10 },
  { tool: "V4Chat",     clientes: 9  },
  { tool: "CRM",        clientes: 8  },
  { tool: "RD Station", clientes: 3  },
  { tool: "GreatPages", clientes: 2  },
];

const STATUS_PIE = [
  { name: "Ativos",        value: 11, color: "#22c55e" },
  { name: "Implantação",   value: 2,  color: "#38bdf8" },
  { name: "Manutenção",    value: 2,  color: "#f59e0b" },
  { name: "Inativos",      value: 2,  color: "#52525b" },
];

const AUTO_BY_TYPE = [
  { tipo: "n8n",         total: 10, color: "#f97316" },
  { tipo: "Typebot",     total: 7,  color: "#38bdf8" },
  { tipo: "Webhook",     total: 2,  color: "#a78bfa" },
  { tipo: "CRM",         total: 2,  color: "#4ade80" },
  { tipo: "V4Chat",      total: 1,  color: "#fb7185" },
  { tipo: "Disparo",     total: 1,  color: "#fcd34d" },
];

const AUTO_STATUS_PIE = [
  { name: "Ativas",      value: 15, color: "#22c55e" },
  { name: "Em dev",      value: 3,  color: "#38bdf8" },
  { name: "Manutenção",  value: 3,  color: "#f59e0b" },
  { name: "Com erro",    value: 2,  color: "#ef4444" },
  { name: "Inativas",    value: 1,  color: "#52525b" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS & MICRO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const fmtCurrency = (v) => `R$ ${v.toLocaleString("pt-BR")}`;

const CLIENT_STATUS = {
  active:      { label: "Ativo",        dot: "#22c55e", bg: "rgba(34,197,94,.12)",  text: "#4ade80" },
  onboarding:  { label: "Implantação",  dot: "#38bdf8", bg: "rgba(56,189,248,.12)", text: "#7dd3fc" },
  maintenance: { label: "Manutenção",   dot: "#f59e0b", bg: "rgba(245,158,11,.12)", text: "#fcd34d" },
  inactive:    { label: "Inativo",      dot: "#52525b", bg: "rgba(82,82,91,.15)",   text: "#a1a1aa" },
};

const AUTO_STATUS = {
  active:      { label: "Ativa",        dot: "#22c55e", bg: "rgba(34,197,94,.12)",   text: "#4ade80" },
  error:       { label: "Erro",         dot: "#ef4444", bg: "rgba(239,68,68,.15)",   text: "#f87171" },
  maintenance: { label: "Manutenção",   dot: "#f59e0b", bg: "rgba(245,158,11,.12)",  text: "#fcd34d" },
  development: { label: "Em dev",       dot: "#38bdf8", bg: "rgba(56,189,248,.12)",  text: "#7dd3fc" },
  inactive:    { label: "Inativa",      dot: "#52525b", bg: "rgba(82,82,91,.15)",    text: "#a1a1aa" },
};

const INST_STATUS = {
  active:      { label: "Ativa",        dot: "#22c55e", bg: "rgba(34,197,94,.12)",  text: "#4ade80" },
  blocked:     { label: "Bloqueada",    dot: "#ef4444", bg: "rgba(239,68,68,.15)",  text: "#f87171" },
  maintenance: { label: "Manutenção",   dot: "#f59e0b", bg: "rgba(245,158,11,.12)", text: "#fcd34d" },
  inactive:    { label: "Inativa",      dot: "#52525b", bg: "rgba(82,82,91,.15)",   text: "#a1a1aa" },
};

const DOC_STATUS = {
  published: { label: "Publicada", bg: "rgba(34,197,94,.12)",  text: "#4ade80" },
  draft:     { label: "Rascunho",  bg: "rgba(245,158,11,.12)", text: "#fcd34d" },
  archived:  { label: "Arquivada", bg: "rgba(82,82,91,.15)",   text: "#a1a1aa" },
};

const TOOL_PILL = {
  "n8n":        { bg: "rgba(249,115,22,.15)", text: "#fdba74" },
  "Typebot":    { bg: "rgba(56,189,248,.15)", text: "#7dd3fc" },
  "V4Chat":     { bg: "rgba(167,139,250,.15)",text: "#c4b5fd" },
  "CRM":        { bg: "rgba(74,222,128,.15)", text: "#86efac" },
  "RD Station": { bg: "rgba(251,113,133,.15)",text: "#fda4af" },
  "GreatPages": { bg: "rgba(252,211,77,.15)", text: "#fde68a" },
};

function Badge({ cfg, label }) {
  return (
    <span style={{ background: cfg.bg, color: cfg.text, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
      {cfg.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />}
      {label || cfg.label}
    </span>
  );
}

function ToolTag({ tool }) {
  const cfg = TOOL_PILL[tool] || { bg: "rgba(255,255,255,.08)", text: "#a1a1aa" };
  return <span style={{ background: cfg.bg, color: cfg.text, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{tool}</span>;
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <svg style={{ position: "absolute", left: 10, color: "#52525b" }} width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Buscar..."}
        style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 12px 8px 30px", color: "#e4e4e7", fontSize: 13, outline: "none", width: 220 }}
      />
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 12px", color: "#e4e4e7", fontSize: 13, outline: "none", cursor: "pointer" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      {label && <p style={{ color: "#71717a", marginBottom: 6 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#fff", fontWeight: 600, margin: "2px 0" }}>
          {p.name}: {typeof p.value === "number" && p.name?.includes("FEE") ? fmtCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

function PieCustomLabel({ cx, cy, midAngle, outerRadius, name, value, percent }) {
  if (percent < 0.08) return null;
  const RADIAN = Math.PI / 180;
  const x = cx + (outerRadius + 18) * Math.cos(-midAngle * RADIAN);
  const y = cy + (outerRadius + 18) * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#a1a1aa" textAnchor={x > cx ? "start" : "end"} fontSize={11}>
      {name} {Math.round(percent * 100)}%
    </text>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background: "#111111", border: "1px solid #1f1f1f", borderRadius: 12, padding: "18px 20px", position: "relative", overflow: "hidden", cursor: "default" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent || "#dc2626" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {sub && <span style={{ fontSize: 11, color: "#52525b", background: "#1a1a1a", padding: "3px 8px", borderRadius: 6 }}>{sub}</span>}
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: -1, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, color: "#71717a", marginTop: 4, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function PageDashboard() {
  const totalFee = CLIENTS_DATA.filter(c => c.status === "active").reduce((s, c) => s + c.fee, 0);
  const alerts = AUTOMATIONS_DATA.filter(a => a.status === "error");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#ef4444", fontSize: 16 }}>⚠</span>
          <span style={{ color: "#fca5a5", fontSize: 13, fontWeight: 500 }}>
            {alerts.length} automação{alerts.length > 1 ? "ões" : ""} com erro detectada{alerts.length > 1 ? "s" : ""}:
          </span>
          <span style={{ color: "#ef4444", fontSize: 13 }}>
            {alerts.map(a => `"${a.name}"`).join(", ")}
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard icon="👥" label="Clientes Ativos"    value={CLIENTS_DATA.filter(c=>c.status==="active").length}    sub="+3 esse mês"       accent="#dc2626" />
        <StatCard icon="⚡" label="Automações"          value={AUTOMATIONS_DATA.length}                               sub="2 com erro"         accent="#f97316" />
        <StatCard icon="🔁" label="Fluxos n8n"          value={AUTOMATIONS_DATA.filter(a=>a.type==="n8n").length}    sub="10 ativos"          accent="#38bdf8" />
        <StatCard icon="🤖" label="Bots Typebot"         value={AUTOMATIONS_DATA.filter(a=>a.type==="Typebot").length} sub="todos ativos"       accent="#a78bfa" />
        <StatCard icon="💬" label="Clientes V4Chat"      value={CLIENTS_DATA.filter(c=>c.tools.includes("V4Chat")).length} sub=""              accent="#c4b5fd" />
        <StatCard icon="📊" label="Clientes com CRM"     value={CLIENTS_DATA.filter(c=>c.tools.includes("CRM")).length}    sub=""             accent="#4ade80" />
        <StatCard icon="📱" label="Instâncias Ativas"   value={INSTANCES_DATA.filter(i=>i.status==="active").length}  sub="1 bloqueada"        accent="#fcd34d" />
        <StatCard icon="💰" label="FEE Mensal Total"    value={fmtCurrency(totalFee)}                                  sub="receita ativa"      accent="#dc2626" />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* FEE Area Chart */}
        <div style={{ background: "#111111", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Crescimento de FEE Mensal</p>
          <p style={{ fontSize: 11, color: "#52525b", marginBottom: 16 }}>Receita acumulada dos clientes ativos — últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={FEE_MONTHLY}>
              <defs>
                <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="fee" name="FEE Total" stroke="#dc2626" strokeWidth={2} fill="url(#feeGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Client Status Pie */}
        <div style={{ background: "#111111", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Status dos Clientes</p>
          <p style={{ fontSize: 11, color: "#52525b", marginBottom: 8 }}>Distribuição por situação atual</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={STATUS_PIE} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" labelLine={false} label={PieCustomLabel}>
                {STATUS_PIE.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Tools Adoption */}
        <div style={{ background: "#111111", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Adoção de Ferramentas</p>
          <p style={{ fontSize: 11, color: "#52525b", marginBottom: 16 }}>Quantos clientes usam cada ferramenta</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={TOOLS_ADOPTION} layout="vertical">
              <CartesianGrid stroke="#1f1f1f" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="tool" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="clientes" name="Clientes" radius={[0, 4, 4, 0]} fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Automations by Type */}
        <div style={{ background: "#111111", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Automações por Tipo</p>
          <p style={{ fontSize: 11, color: "#52525b", marginBottom: 16 }}>Volume de automações por tecnologia utilizada</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={AUTO_BY_TYPE}>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
              <XAxis dataKey="tipo" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
                {AUTO_BY_TYPE.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom: recent clients + recent docs */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
        {/* Recent Clients */}
        <div style={{ background: "#111111", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Clientes Recentes</p>
            <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, cursor: "pointer" }}>Ver todos →</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                {["Cliente", "Status", "FEE", "Atualizado"].map(h => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, color: "#52525b", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLIENTS_DATA.slice(0, 6).map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid #141414" }}>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#dc2626", flexShrink: 0 }}>
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>{c.name}</p>
                        <p style={{ fontSize: 11, color: "#52525b" }}>{c.company}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 20px" }}><Badge cfg={CLIENT_STATUS[c.status]} /></td>
                  <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#fff" }}>{fmtCurrency(c.fee)}</td>
                  <td style={{ padding: "12px 20px", fontSize: 11, color: "#52525b" }}>{c.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Auto Status + Recent Docs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Auto status donut */}
          <div style={{ background: "#111111", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Status das Automações</p>
            <p style={{ fontSize: 11, color: "#52525b", marginBottom: 8 }}>Saúde geral das automações ativas</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={AUTO_STATUS_PIE} cx="50%" cy="50%" innerRadius={36} outerRadius={54} paddingAngle={2} dataKey="value" labelLine={false}>
                    {AUTO_STATUS_PIE.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {AUTO_STATUS_PIE.map(e => (
                  <div key={e.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                      <span style={{ color: "#a1a1aa" }}>{e.name}</span>
                    </div>
                    <span style={{ color: "#fff", fontWeight: 700 }}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Docs */}
          <div style={{ background: "#111111", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden", flex: 1 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #1f1f1f", display: "flex", justifyContent: "space-between" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Documentações Recentes</p>
              <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, cursor: "pointer" }}>Ver todas →</span>
            </div>
            {DOCS_DATA.slice(0, 4).map(d => (
              <div key={d.id} style={{ padding: "12px 18px", borderBottom: "1px solid #141414", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 28, height: 28, background: "#1a1a1a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#d4d4d8", lineHeight: 1.4, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Badge cfg={DOC_STATUS[d.status]} />
                    <span style={{ fontSize: 10, color: "#3f3f46" }}>{d.updatedAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: CLIENTS
// ═══════════════════════════════════════════════════════════════════════════════

function PageClients() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => CLIENTS_DATA.filter(c =>
    (statusFilter === "all" || c.status === statusFilter) &&
    (c.name.toLowerCase().includes(q.toLowerCase()) || c.company.toLowerCase().includes(q.toLowerCase()))
  ), [q, statusFilter]);

  if (selected) {
    const c = selected;
    const automations = AUTOMATIONS_DATA.filter(a => a.clientId === c.id);
    const instances = INSTANCES_DATA.filter(i => i.clientId === c.id);
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ display: "flex", alignItems: "center", gap: 6, color: "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 20, background: "none", border: "none", cursor: "pointer" }}>
          ← Voltar para Clientes
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
          <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#dc2626", marginBottom: 14 }}>
              {c.name.slice(0, 2).toUpperCase()}
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{c.name}</p>
            <p style={{ fontSize: 12, color: "#71717a", marginBottom: 14 }}>{c.company}</p>
            <Badge cfg={CLIENT_STATUS[c.status]} />
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {[["FEE Mensal", fmtCurrency(c.fee)], ["Responsável", c.owner], ["Cadastrado", c.createdAt], ["Atualizado", c.updatedAt]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#52525b" }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#d4d4d8" }}>{v}</span>
                </div>
              ))}
            </div>
            {c.notes && <p style={{ marginTop: 14, fontSize: 12, color: "#71717a", background: "#1a1a1a", borderRadius: 8, padding: "8px 12px" }}>{c.notes}</p>}
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, color: "#52525b", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Ferramentas</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{c.tools.map(t => <ToolTag key={t} tool={t} />)}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
              <p style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "#fff", borderBottom: "1px solid #1f1f1f" }}>Automações ({automations.length})</p>
              {automations.length === 0 ? <p style={{ padding: 18, fontSize: 13, color: "#52525b" }}>Nenhuma automação cadastrada.</p> :
                automations.map(a => (
                  <div key={a.id} style={{ padding: "12px 18px", borderBottom: "1px solid #141414", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>{a.name}</p>
                      <p style={{ fontSize: 11, color: "#52525b" }}>{a.type} · {a.owner}</p>
                    </div>
                    <Badge cfg={AUTO_STATUS[a.status]} />
                  </div>
                ))
              }
            </div>
            <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
              <p style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "#fff", borderBottom: "1px solid #1f1f1f" }}>Instâncias ({instances.length})</p>
              {instances.length === 0 ? <p style={{ padding: 18, fontSize: 13, color: "#52525b" }}>Nenhuma instância cadastrada.</p> :
                instances.map(i => (
                  <div key={i.id} style={{ padding: "12px 18px", borderBottom: "1px solid #141414", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>{i.name}</p>
                      <p style={{ fontSize: 11, color: "#52525b" }}>{i.identifier}</p>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {i.isV4Chat && <span style={{ background: "rgba(167,139,250,.15)", color: "#c4b5fd", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>V4Chat</span>}
                      {i.isDispatch && <span style={{ background: "rgba(249,115,22,.15)", color: "#fdba74", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>Disparo</span>}
                      <Badge cfg={INST_STATUS[i.status]} />
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Clientes</h2>
          <p style={{ fontSize: 12, color: "#52525b" }}>{filtered.length} cliente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <button style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Novo Cliente</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar cliente..." />
        <Select value={statusFilter} onChange={setStatusFilter} options={[
          { value: "all", label: "Todos os status" },
          { value: "active", label: "Ativo" },
          { value: "onboarding", label: "Implantação" },
          { value: "maintenance", label: "Manutenção" },
          { value: "inactive", label: "Inativo" },
        ]} />
      </div>
      <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1f1f1f" }}>
              {["Cliente", "Unidade", "Status", "Ferramentas", "FEE Mensal", "Responsável", ""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #141414" }}>
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#dc2626", flexShrink: 0 }}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7" }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: "#3f3f46" }}>{c.updatedAt}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 18px", fontSize: 12, color: "#71717a" }}>{c.company}</td>
                <td style={{ padding: "14px 18px" }}><Badge cfg={CLIENT_STATUS[c.status]} /></td>
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {c.tools.slice(0, 3).map(t => <ToolTag key={t} tool={t} />)}
                    {c.tools.length > 3 && <span style={{ fontSize: 11, color: "#52525b" }}>+{c.tools.length - 3}</span>}
                  </div>
                </td>
                <td style={{ padding: "14px 18px", fontSize: 13, fontWeight: 800, color: "#fff" }}>{fmtCurrency(c.fee)}</td>
                <td style={{ padding: "14px 18px", fontSize: 12, color: "#71717a" }}>{c.owner}</td>
                <td style={{ padding: "14px 18px" }}>
                  <button onClick={() => setSelected(c)} style={{ background: "rgba(220,38,38,.12)", color: "#f87171", border: "1px solid rgba(220,38,38,.25)", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: AUTOMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function PageAutomations() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const types = ["all", ...new Set(AUTOMATIONS_DATA.map(a => a.type))];

  const filtered = useMemo(() => AUTOMATIONS_DATA.filter(a =>
    (typeFilter === "all" || a.type === typeFilter) &&
    (statusFilter === "all" || a.status === statusFilter) &&
    a.name.toLowerCase().includes(q.toLowerCase())
  ), [q, typeFilter, statusFilter]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Automações</h2>
          <p style={{ fontSize: 12, color: "#52525b" }}>{filtered.length} automações encontradas</p>
        </div>
        <button style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nova Automação</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar automação..." />
        <Select value={typeFilter} onChange={setTypeFilter} options={[{ value: "all", label: "Todos os tipos" }, ...types.filter(t => t !== "all").map(t => ({ value: t, label: t }))]} />
        <Select value={statusFilter} onChange={setStatusFilter} options={[
          { value: "all", label: "Todos os status" },
          { value: "active", label: "Ativa" },
          { value: "error", label: "Com erro" },
          { value: "development", label: "Em dev" },
          { value: "maintenance", label: "Manutenção" },
          { value: "inactive", label: "Inativa" },
        ]} />
      </div>
      <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1f1f1f" }}>
              {["Automação", "Cliente", "Tipo", "Status", "Responsável", "Atualizado"].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const client = CLIENTS_DATA.find(c => c.id === a.clientId);
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid #141414" }}>
                  <td style={{ padding: "13px 18px" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>{a.name}</p>
                    <p style={{ fontSize: 11, color: "#3f3f46", marginTop: 2 }}>{a.description?.slice(0, 50)}{a.description?.length > 50 ? "…" : ""}</p>
                  </td>
                  <td style={{ padding: "13px 18px", fontSize: 12, color: "#a1a1aa" }}>{client?.name || "—"}</td>
                  <td style={{ padding: "13px 18px" }}><ToolTag tool={a.type} /></td>
                  <td style={{ padding: "13px 18px" }}><Badge cfg={AUTO_STATUS[a.status]} /></td>
                  <td style={{ padding: "13px 18px", fontSize: 12, color: "#71717a" }}>{a.owner}</td>
                  <td style={{ padding: "13px 18px", fontSize: 11, color: "#3f3f46" }}>{a.updatedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: INSTANCES
// ═══════════════════════════════════════════════════════════════════════════════

function PageInstances() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => INSTANCES_DATA.filter(i =>
    (filter === "all" || (filter === "v4chat" && i.isV4Chat) || (filter === "dispatch" && i.isDispatch) || i.status === filter) &&
    (i.name.toLowerCase().includes(q.toLowerCase()) || i.identifier.includes(q))
  ), [q, filter]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Instâncias / Caixas de Entrada</h2>
          <p style={{ fontSize: 12, color: "#52525b" }}>{filtered.length} instâncias encontradas</p>
        </div>
        <button style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nova Instância</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar instância ou número..." />
        <Select value={filter} onChange={setFilter} options={[
          { value: "all", label: "Todas" },
          { value: "v4chat", label: "V4Chat conectadas" },
          { value: "dispatch", label: "Para disparo" },
          { value: "active", label: "Ativas" },
          { value: "blocked", label: "Bloqueadas" },
          { value: "inactive", label: "Inativas" },
        ]} />
      </div>
      <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1f1f1f" }}>
              {["Instância", "Cliente", "Identificador", "V4Chat", "Disparo", "Status"].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => {
              const client = CLIENTS_DATA.find(c => c.id === i.clientId);
              return (
                <tr key={i.id} style={{ borderBottom: "1px solid #141414" }}>
                  <td style={{ padding: "13px 18px" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>{i.name}</p>
                    <p style={{ fontSize: 11, color: "#3f3f46" }}>{i.tool}</p>
                  </td>
                  <td style={{ padding: "13px 18px", fontSize: 12, color: "#a1a1aa" }}>{client?.name || "—"}</td>
                  <td style={{ padding: "13px 18px", fontSize: 12, color: "#71717a", fontFamily: "monospace" }}>{i.identifier}</td>
                  <td style={{ padding: "13px 18px", textAlign: "center" }}>
                    <span style={{ fontSize: 16 }}>{i.isV4Chat ? "✅" : "⬜"}</span>
                  </td>
                  <td style={{ padding: "13px 18px", textAlign: "center" }}>
                    <span style={{ fontSize: 16 }}>{i.isDispatch ? "🚀" : "⬜"}</span>
                  </td>
                  <td style={{ padding: "13px 18px" }}>
                    <Badge cfg={INST_STATUS[i.status]} />
                    {i.notes && <p style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>{i.notes}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: DOCS
// ═══════════════════════════════════════════════════════════════════════════════

function PageDocs() {
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const cats = ["all", ...new Set(DOCS_DATA.map(d => d.category))];

  const filtered = useMemo(() => DOCS_DATA.filter(d =>
    (catFilter === "all" || d.category === catFilter) &&
    (statusFilter === "all" || d.status === statusFilter) &&
    (d.title.toLowerCase().includes(q.toLowerCase()) || d.tags.some(t => t.toLowerCase().includes(q.toLowerCase())))
  ), [q, catFilter, statusFilter]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Documentações</h2>
          <p style={{ fontSize: 12, color: "#52525b" }}>{filtered.length} documentações encontradas</p>
        </div>
        <button style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nova Doc</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar título ou tag..." />
        <Select value={catFilter} onChange={setCatFilter} options={[{ value: "all", label: "Todas as categorias" }, ...cats.filter(c => c !== "all").map(c => ({ value: c, label: c }))]} />
        <Select value={statusFilter} onChange={setStatusFilter} options={[
          { value: "all", label: "Todos os status" },
          { value: "published", label: "Publicada" },
          { value: "draft", label: "Rascunho" },
          { value: "archived", label: "Arquivada" },
        ]} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {filtered.map(d => (
          <div key={d.id} style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, padding: 18, cursor: "pointer", transition: "border-color .2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#dc2626"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#1f1f1f"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>📄</span>
              <Badge cfg={DOC_STATUS[d.status]} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", lineHeight: 1.5, marginBottom: 8 }}>{d.title}</p>
            <p style={{ fontSize: 11, color: "#52525b", marginBottom: 12 }}>{d.category} · Área: {d.area}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
              {d.tags.map(t => (
                <span key={t} style={{ background: "#1a1a1a", color: "#71717a", padding: "2px 8px", borderRadius: 4, fontSize: 10, border: "1px solid #2a2a2a" }}>{t}</span>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #1a1a1a", paddingTop: 10 }}>
              <span style={{ fontSize: 11, color: "#3f3f46" }}>{d.author}</span>
              <span style={{ fontSize: 11, color: "#3f3f46" }}>{d.updatedAt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: USERS (admin)
// ═══════════════════════════════════════════════════════════════════════════════

function PageUsers() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Usuários</h2>
          <p style={{ fontSize: 12, color: "#52525b" }}>Gestão de acesso ao sistema</p>
        </div>
        <button style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Convidar Usuário</button>
      </div>
      <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1f1f1f" }}>
              {["Usuário", "Email", "Perfil", "Status", "Último Acesso", "Cadastrado", ""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {USERS_DATA.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid #141414" }}>
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: u.role === "ADMIN" ? "rgba(220,38,38,.2)" : "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: u.role === "ADMIN" ? "#f87171" : "#71717a", flexShrink: 0 }}>
                      {u.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 18px", fontSize: 12, color: "#71717a" }}>{u.email}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ background: u.role === "ADMIN" ? "rgba(220,38,38,.12)" : "rgba(255,255,255,.06)", color: u.role === "ADMIN" ? "#f87171" : "#a1a1aa", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: u.active ? "#4ade80" : "#71717a" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: u.active ? "#22c55e" : "#52525b" }} />
                    {u.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td style={{ padding: "14px 18px", fontSize: 12, color: "#52525b" }}>{u.lastLogin}</td>
                <td style={{ padding: "14px 18px", fontSize: 12, color: "#3f3f46" }}>{u.createdAt}</td>
                <td style={{ padding: "14px 18px" }}>
                  <button style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#71717a", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHELL: SIDEBAR + TOPBAR + ROUTING
// ═══════════════════════════════════════════════════════════════════════════════

const NAV = [
  { id: "dashboard",   label: "Dashboard",   icon: "▦" },
  { id: "clients",     label: "Clientes",    icon: "👥" },
  { id: "automations", label: "Automações",  icon: "⚡" },
  { id: "instances",   label: "Instâncias",  icon: "📱" },
  { id: "docs",        label: "Docs",        icon: "📄" },
  { id: "users",       label: "Usuários",    icon: "🔐" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const pages = { dashboard: <PageDashboard />, clients: <PageClients />, automations: <PageAutomations />, instances: <PageInstances />, docs: <PageDocs />, users: <PageUsers /> };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif", color: "#fff", overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: sidebarOpen ? 220 : 60, background: "#0f0f0f", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", transition: "width .25s ease", overflow: "hidden", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: sidebarOpen ? "20px 18px" : "20px 14px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#fff", flexShrink: 0 }}>V4</div>
          {sidebarOpen && (
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1 }}>IT Hub</p>
              <p style={{ fontSize: 11, color: "#3f3f46", lineHeight: 1, marginTop: 3 }}>V4 Company</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "9px 12px" : "9px", borderRadius: 8, border: "none", cursor: "pointer", width: "100%", textAlign: "left", transition: "all .15s",
                background: page === item.id ? "rgba(220,38,38,.15)" : "transparent",
                color: page === item.id ? "#f87171" : "#52525b" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span style={{ fontSize: 13, fontWeight: page === item.id ? 700 : 500, whiteSpace: "nowrap" }}>{item.label}</span>}
              {sidebarOpen && page === item.id && <span style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }} />}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#fff", flexShrink: 0 }}>GG</div>
            {sidebarOpen && (
              <div style={{ overflow: "hidden" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Gabriel Guerra</p>
                <p style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>ADMIN</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{ background: "#0f0f0f", borderBottom: "1px solid #1a1a1a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: 6, borderRadius: 6, display: "flex" }}>
              <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {NAV.find(n => n.id === page) && (
                <>
                  <span style={{ fontSize: 14 }}>{NAV.find(n => n.id === page).icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{NAV.find(n => n.id === page).label}</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#161616", border: "1px solid #1f1f1f", borderRadius: 8, padding: "7px 12px" }}>
              <svg width={14} height={14} fill="none" stroke="#52525b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span style={{ fontSize: 12, color: "#3f3f46" }}>Busca rápida...</span>
              <span style={{ fontSize: 10, color: "#2a2a2a", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, padding: "1px 5px" }}>⌘K</span>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", position: "relative" }}>
              <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span style={{ position: "absolute", top: 0, right: 0, width: 7, height: 7, background: "#dc2626", borderRadius: "50%", border: "1.5px solid #0f0f0f" }} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24, background: "#0a0a0a" }}>
          {pages[page]}
        </main>
      </div>
    </div>
  );
}
