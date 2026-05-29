export const USERS_DATA = [
  { id:1, name:"Gabriel Guerra",  email:"gabriel.guerra@v4company.com",  role:"ADMIN", active:true,  lastLogin:"15/01 às 09:32", createdAt:"01/06/2023" },
  { id:2, name:"Mariana Torres",  email:"mariana.torres@v4company.com",  role:"USER",  active:true,  lastLogin:"15/01 às 08:45", createdAt:"15/07/2023" },
  { id:3, name:"Ricardo Lima",    email:"ricardo.lima@v4company.com",    role:"USER",  active:true,  lastLogin:"14/01 às 17:20", createdAt:"01/08/2023" },
  { id:4, name:"Ana Costa",       email:"ana.costa@v4company.com",       role:"ADMIN", active:true,  lastLogin:"15/01 às 10:00", createdAt:"15/06/2023" },
  { id:5, name:"Pedro Alves",     email:"pedro.alves@v4company.com",     role:"USER",  active:false, lastLogin:"10/01 às 14:00", createdAt:"01/09/2023" },
];

export const CLIENTS_DATA = [
  { id:1,  name:"Acme Corp",     company:"Unidade SP", status:"active",      fee:4200, owner:"Gabriel G.", tools:["n8n","V4Chat","Typebot","CRM"],     updatedAt:"há 2h",  createdAt:"15/06/2023", notes:"Cliente principal, alto volume" },
  { id:2,  name:"Beta Digital",  company:"Unidade RJ", status:"onboarding",  fee:2800, owner:"Mariana T.", tools:["n8n","CRM"],                         updatedAt:"há 5h",  createdAt:"10/01/2024", notes:"Em processo de onboarding" },
  { id:3,  name:"Gamma Leads",   company:"Unidade BH", status:"maintenance", fee:1500, owner:"Ricardo L.", tools:["Typebot"],                           updatedAt:"há 1d",  createdAt:"20/09/2023", notes:"Revisão de fluxos em andamento" },
  { id:4,  name:"Delta Vendas",  company:"Unidade PE", status:"active",      fee:5600, owner:"Gabriel G.", tools:["n8n","V4Chat","CRM","Typebot"],       updatedAt:"há 1d",  createdAt:"01/05/2023", notes:"Maior cliente em receita" },
  { id:5,  name:"Epsilon Pro",   company:"Unidade CE", status:"inactive",    fee:900,  owner:"Mariana T.", tools:["CRM"],                               updatedAt:"há 3d",  createdAt:"15/11/2023", notes:"Contrato pausado" },
  { id:6,  name:"Zeta Mkt",      company:"Unidade RS", status:"active",      fee:3100, owner:"Ana C.",     tools:["n8n","Typebot","RD Station"],         updatedAt:"há 2d",  createdAt:"20/07/2023", notes:"" },
  { id:7,  name:"Eta Commerce",  company:"Unidade PR", status:"active",      fee:2400, owner:"Ricardo L.", tools:["V4Chat","CRM"],                      updatedAt:"há 4h",  createdAt:"10/08/2023", notes:"" },
  { id:8,  name:"Theta Tech",    company:"Unidade SC", status:"onboarding",  fee:1800, owner:"Gabriel G.", tools:["n8n"],                               updatedAt:"há 6h",  createdAt:"05/01/2024", notes:"Novo cliente" },
  { id:9,  name:"Iota Serviços", company:"Unidade GO", status:"active",      fee:3800, owner:"Ana C.",     tools:["n8n","V4Chat","Typebot"],            updatedAt:"há 3h",  createdAt:"15/04/2023", notes:"" },
  { id:10, name:"Kappa Auto",    company:"Unidade DF", status:"active",      fee:2100, owner:"Mariana T.", tools:["Typebot","CRM"],                     updatedAt:"há 1d",  createdAt:"01/10/2023", notes:"" },
  { id:11, name:"Lambda Edu",    company:"Unidade MG", status:"maintenance", fee:1200, owner:"Ricardo L.", tools:["n8n","Typebot"],                     updatedAt:"há 2d",  createdAt:"01/12/2023", notes:"Ajustes em integrações" },
  { id:12, name:"Mu Saúde",      company:"Unidade SP", status:"active",      fee:4500, owner:"Gabriel G.", tools:["n8n","V4Chat","CRM","RD Station"],   updatedAt:"há 5h",  createdAt:"10/03/2023", notes:"" },
  { id:13, name:"Nu Imóveis",    company:"Unidade RJ", status:"active",      fee:3300, owner:"Ana C.",     tools:["n8n","V4Chat","Typebot"],            updatedAt:"há 8h",  createdAt:"25/08/2023", notes:"" },
  { id:14, name:"Xi Logística",  company:"Unidade PR", status:"inactive",    fee:1600, owner:"Mariana T.", tools:["CRM"],                               updatedAt:"há 5d",  createdAt:"20/10/2023", notes:"Em análise de renovação" },
  { id:15, name:"Omicron Var",   company:"Unidade BA", status:"active",      fee:2700, owner:"Ricardo L.", tools:["n8n","Typebot","V4Chat"],            updatedAt:"há 1d",  createdAt:"05/09/2023", notes:"" },
];

export const AUTOMATIONS_DATA = [
  { id:1,  name:"Lead Nurturing - Email",      clientId:1,  type:"n8n",         status:"active",      owner:"Gabriel G.", updatedAt:"10/01", description:"Fluxo de nutrição integrado ao RD Station" },
  { id:2,  name:"Bot Qualificação WhatsApp",   clientId:1,  type:"Typebot",      status:"active",      owner:"Mariana T.", updatedAt:"12/01", description:"Qualificação de leads via WhatsApp" },
  { id:3,  name:"Sync CRM → n8n",             clientId:1,  type:"n8n",         status:"error",       owner:"Ricardo L.", updatedAt:"14/01", description:"ERRO: timeout na API do CRM" },
  { id:4,  name:"Disparo Campanha Mensal",     clientId:4,  type:"n8n",         status:"active",      owner:"Gabriel G.", updatedAt:"08/01", description:"Disparos mensais via WhatsApp" },
  { id:5,  name:"Onboarding Bot",             clientId:4,  type:"Typebot",      status:"active",      owner:"Ana C.",     updatedAt:"05/01", description:"Fluxo de onboarding de novos clientes" },
  { id:6,  name:"Relatório Semanal Auto",     clientId:4,  type:"n8n",         status:"development", owner:"Gabriel G.", updatedAt:"15/01", description:"Em desenvolvimento: relatório automático" },
  { id:7,  name:"Integração RD → CRM",        clientId:6,  type:"n8n",         status:"active",      owner:"Ricardo L.", updatedAt:"11/01", description:"Integração bidirecional RD Station e CRM" },
  { id:8,  name:"Bot Suporte Pré-Venda",      clientId:6,  type:"Typebot",      status:"active",      owner:"Mariana T.", updatedAt:"13/01", description:"Chatbot de suporte para pré-vendas" },
  { id:9,  name:"Pipeline Vendas Auto",       clientId:7,  type:"CRM",         status:"active",      owner:"Ana C.",     updatedAt:"09/01", description:"Automação de pipeline de vendas no CRM" },
  { id:10, name:"Follow-up V4Chat",           clientId:7,  type:"V4Chat",      status:"active",      owner:"Gabriel G.", updatedAt:"12/01", description:"Follow-up automático via V4Chat" },
  { id:11, name:"Captura Leads GreatPages",   clientId:9,  type:"webhook",     status:"active",      owner:"Ricardo L.", updatedAt:"10/01", description:"Webhook de captura do GreatPages" },
  { id:12, name:"Nutrição Email Sequencial",  clientId:9,  type:"n8n",         status:"active",      owner:"Mariana T.", updatedAt:"11/01", description:"Sequência de emails de nutrição" },
  { id:13, name:"Bot Agendamento",            clientId:9,  type:"Typebot",      status:"maintenance", owner:"Ana C.",     updatedAt:"14/01", description:"Bot de agendamento em manutenção" },
  { id:14, name:"Disparo Promo Semanal",      clientId:12, type:"n8n",         status:"active",      owner:"Gabriel G.", updatedAt:"13/01", description:"Disparos promocionais semanais" },
  { id:15, name:"Integração Planos de Saúde", clientId:12, type:"integration", status:"active",      owner:"Ricardo L.", updatedAt:"08/01", description:"Integração com sistemas de saúde" },
  { id:16, name:"CRM Saúde Pipeline",         clientId:12, type:"CRM",         status:"error",       owner:"Mariana T.", updatedAt:"15/01", description:"ERRO: falha na sincronização de pacientes" },
  { id:17, name:"Qualificação Imóvel Bot",    clientId:13, type:"Typebot",      status:"active",      owner:"Ana C.",     updatedAt:"10/01", description:"Qualificação de leads de imóveis" },
  { id:18, name:"Disparo Lançamento",         clientId:13, type:"dispatch",    status:"active",      owner:"Gabriel G.", updatedAt:"09/01", description:"Disparos para lançamentos de imóveis" },
  { id:19, name:"Lead Scoring n8n",           clientId:15, type:"n8n",         status:"active",      owner:"Mariana T.", updatedAt:"11/01", description:"Pontuação automática de leads" },
  { id:20, name:"Bot Varejo WhatsApp",        clientId:15, type:"Typebot",      status:"development", owner:"Ricardo L.", updatedAt:"15/01", description:"Bot em desenvolvimento para varejo" },
  { id:21, name:"Webhook GreatPages → CRM",   clientId:10, type:"webhook",     status:"active",      owner:"Ana C.",     updatedAt:"10/01", description:"Captura via GreatPages para CRM" },
  { id:22, name:"Bot FAQ Lambda",             clientId:11, type:"Typebot",      status:"maintenance", owner:"Gabriel G.", updatedAt:"13/01", description:"FAQ automatizado em manutenção" },
  { id:23, name:"Nutrição n8n Lambda",        clientId:11, type:"n8n",         status:"inactive",    owner:"Mariana T.", updatedAt:"05/01", description:"Fluxo inativo aguardando revisão" },
];

export const INSTANCES_DATA = [
  { id:1,  name:"Acme - Principal",    clientId:1,  identifier:"+55 11 99001-0001", isV4Chat:true,  isDispatch:false, status:"active",      tool:"V4Chat" },
  { id:2,  name:"Acme - Disparo",      clientId:1,  identifier:"+55 11 99001-0002", isV4Chat:false, isDispatch:true,  status:"active",      tool:"n8n" },
  { id:3,  name:"Acme - Suporte",      clientId:1,  identifier:"+55 11 99001-0003", isV4Chat:true,  isDispatch:false, status:"active",      tool:"V4Chat" },
  { id:4,  name:"Beta - WhatsApp",     clientId:2,  identifier:"+55 21 98002-0001", isV4Chat:false, isDispatch:false, status:"active",      tool:"n8n" },
  { id:5,  name:"Delta - Principal",   clientId:4,  identifier:"+55 81 99004-0001", isV4Chat:true,  isDispatch:false, status:"active",      tool:"V4Chat" },
  { id:6,  name:"Delta - Disparo A",   clientId:4,  identifier:"+55 81 99004-0002", isV4Chat:false, isDispatch:true,  status:"active",      tool:"n8n" },
  { id:7,  name:"Delta - Disparo B",   clientId:4,  identifier:"+55 81 99004-0003", isV4Chat:false, isDispatch:true,  status:"blocked",     tool:"n8n",   notes:"Bloqueada - revisar" },
  { id:8,  name:"Iota - Atendimento", clientId:9,  identifier:"+55 62 99009-0001", isV4Chat:true,  isDispatch:false, status:"active",      tool:"V4Chat" },
  { id:9,  name:"Iota - Disparo",     clientId:9,  identifier:"+55 62 99009-0002", isV4Chat:false, isDispatch:true,  status:"active",      tool:"n8n" },
  { id:10, name:"Mu - Principal",      clientId:12, identifier:"+55 11 99012-0001", isV4Chat:true,  isDispatch:false, status:"active",      tool:"V4Chat" },
  { id:11, name:"Mu - Disparo",        clientId:12, identifier:"+55 11 99012-0002", isV4Chat:false, isDispatch:true,  status:"active",      tool:"n8n" },
  { id:12, name:"Nu - Atendimento",    clientId:13, identifier:"+55 21 99013-0001", isV4Chat:true,  isDispatch:false, status:"active",      tool:"V4Chat" },
  { id:13, name:"Nu - Lançamento",     clientId:13, identifier:"+55 21 99013-0002", isV4Chat:false, isDispatch:true,  status:"maintenance", tool:"n8n" },
  { id:14, name:"Omicron - Principal", clientId:15, identifier:"+55 71 99015-0001", isV4Chat:true,  isDispatch:false, status:"active",      tool:"V4Chat" },
  { id:15, name:"Eta - Atendimento",  clientId:7,  identifier:"+55 41 99007-0001", isV4Chat:true,  isDispatch:false, status:"active",      tool:"V4Chat" },
  { id:16, name:"Zeta - Bot",          clientId:6,  identifier:"+55 51 99006-0001", isV4Chat:false, isDispatch:false, status:"active",      tool:"Typebot" },
  { id:17, name:"Kappa - Atend.",      clientId:10, identifier:"+55 61 99010-0001", isV4Chat:false, isDispatch:false, status:"inactive",    tool:"Typebot" },
];

export const DOCS_DATA = [
  { id:1,  title:"Como configurar webhook no GreatPages",      category:"Integrações", area:"TI",      status:"published", author:"Gabriel G.", tags:["webhook","GreatPages","n8n"],  updatedAt:"há 1h" },
  { id:2,  title:"Fluxo de disparos via n8n + WhatsApp",       category:"Automações",  area:"Cliente", status:"published", author:"Ricardo L.", tags:["n8n","WhatsApp","disparo"],    updatedAt:"há 3h" },
  { id:3,  title:"Configurar token RD Station",                category:"Ferramentas", area:"TI",      status:"draft",     author:"Mariana T.", tags:["RD Station","token","API"],    updatedAt:"há 6h" },
  { id:4,  title:"Onboarding V4Chat — passo a passo",          category:"V4Chat",      area:"Cliente", status:"published", author:"Gabriel G.", tags:["V4Chat","onboarding"],         updatedAt:"há 2d" },
  { id:5,  title:"Como criar fluxo no Typebot",                category:"Typebot",     area:"TI",      status:"published", author:"Ana C.",     tags:["Typebot","bot","fluxo"],       updatedAt:"há 3d" },
  { id:6,  title:"Configuração inicial n8n",                   category:"n8n",         area:"TI",      status:"published", author:"Ricardo L.", tags:["n8n","configuração"],          updatedAt:"há 4d" },
  { id:7,  title:"Gestão de instâncias WhatsApp",              category:"Instâncias",  area:"TI",      status:"published", author:"Gabriel G.", tags:["WhatsApp","instância"],        updatedAt:"há 5d" },
  { id:8,  title:"Procedimentos de emergência — automações",   category:"Processos",   area:"TI",      status:"published", author:"Ana C.",     tags:["emergência","erro"],           updatedAt:"há 1sem" },
  { id:9,  title:"SLA de suporte técnico",                     category:"Processos",   area:"TI",      status:"published", author:"Gabriel G.", tags:["SLA","suporte"],               updatedAt:"há 2sem" },
  { id:10, title:"Integração CRM com n8n — guia avançado",    category:"Integrações", area:"TI",      status:"draft",     author:"Mariana T.", tags:["CRM","n8n","integração"],     updatedAt:"há 3d" },
  { id:11, title:"V4Chat Analytics — como usar",               category:"V4Chat",      area:"Cliente", status:"published", author:"Ricardo L.", tags:["V4Chat","analytics"],          updatedAt:"há 1sem" },
  { id:12, title:"Configuração de disparos em massa",          category:"Automações",  area:"Cliente", status:"archived",  author:"Ana C.",     tags:["disparo","massa"],             updatedAt:"há 2mes" },
];

export const GROWTH_DATA = [
  { mes:"Ago", clientes:12, automacoes:8, instancias:4, bots:2 },
  { mes:"Set", clientes:15, automacoes:12, instancias:6, bots:3 },
  { mes:"Out", clientes:20, automacoes:18, instancias:9, bots:4 },
  { mes:"Nov", clientes:25, automacoes:24, instancias:11, bots:6 },
  { mes:"Dez", clientes:32, automacoes:32, instancias:14, bots:8 },
  { mes:"Jan", clientes:38, automacoes:40, instancias:17, bots:11 },
];

export const TOOLS_ADOPTION = [
  { tool:"n8n", clientes:11 }, { tool:"Typebot", clientes:10 }, { tool:"V4Chat", clientes:9 },
  { tool:"CRM", clientes:8 }, { tool:"RD Station", clientes:3 },
];

export const STATUS_PIE = [
  { name:"Ativos", value:11, color:"#22c55e" }, { name:"Implantação", value:2, color:"#818cf8" },
  { name:"Manutenção", value:2, color:"#eab308" }, { name:"Inativos", value:2, color:"#27272a" },
];

export const AUTO_BY_TYPE = [
  { tipo:"n8n", total:10, color:"#a1a1aa" }, { tipo:"Typebot", total:7, color:"#71717a" },
  { tipo:"Webhook", total:2, color:"#52525b" }, { tipo:"CRM", total:2, color:"#3f3f46" },
  { tipo:"V4Chat", total:1, color:"#27272a" },
];

export const AUTO_STATUS_PIE = [
  { name:"Ativas", value:15, color:"#22c55e" }, { name:"Em dev", value:3, color:"#818cf8" },
  { name:"Manutenção", value:3, color:"#eab308" }, { name:"Com erro", value:2, color:"#ef4444" },
  { name:"Inativas", value:1, color:"#27272a" },
];
