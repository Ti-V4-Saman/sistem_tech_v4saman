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

export const TAGS_DATA = [
  { id: 1,  name: "webhook",       color: "#6366f1" },
  { id: 2,  name: "GreatPages",    color: "#8b5cf6" },
  { id: 3,  name: "n8n",           color: "#ec4899" },
  { id: 4,  name: "WhatsApp",      color: "#22c55e" },
  { id: 5,  name: "disparo",       color: "#f59e0b" },
  { id: 6,  name: "RD Station",    color: "#ef4444" },
  { id: 7,  name: "token",         color: "#14b8a6" },
  { id: 8,  name: "API",           color: "#3b82f6" },
  { id: 9,  name: "V4Chat",        color: "#e92e30" },
  { id: 10, name: "onboarding",    color: "#0ea5e9" },
  { id: 11, name: "Typebot",       color: "#a855f7" },
  { id: 12, name: "bot",           color: "#d946ef" },
  { id: 13, name: "fluxo",         color: "#f97316" },
  { id: 14, name: "configuração",  color: "#64748b" },
  { id: 15, name: "instância",     color: "#06b6d4" },
  { id: 16, name: "emergência",    color: "#dc2626" },
  { id: 17, name: "erro",          color: "#b91c1c" },
  { id: 18, name: "SLA",           color: "#0284c7" },
  { id: 19, name: "suporte",       color: "#7c3aed" },
  { id: 20, name: "CRM",           color: "#059669" },
  { id: 21, name: "integração",    color: "#2563eb" },
  { id: 22, name: "analytics",     color: "#9333ea" },
  { id: 23, name: "massa",         color: "#ca8a04" },
];

export const DOC_TEMPLATES = [
  {
    id: 1,
    name: "Procedimento Operacional",
    description: "Template para documentar procedimentos técnicos passo a passo.",
    content: `<h1>Procedimento Operacional</h1><h2>Objetivo</h2><p>Descreva o objetivo deste procedimento.</p><h2>Pré-requisitos</h2><ul><li>Requisito 1</li><li>Requisito 2</li></ul><h2>Passo a Passo</h2><ol><li>Primeiro passo</li><li>Segundo passo</li><li>Terceiro passo</li></ol><h2>Observações</h2><p>Notas adicionais aqui.</p>`
  },
  {
    id: 2,
    name: "Guia Técnico",
    description: "Template para documentação técnica de integrações e ferramentas.",
    content: `<h1>Guia Técnico</h1><h2>Visão Geral</h2><p>Descrição geral da tecnologia ou integração.</p><h2>Arquitetura</h2><p>Explique a arquitetura e os componentes envolvidos.</p><h2>Configuração</h2><h3>Variáveis de Ambiente</h3><p><code>API_KEY=sua_chave</code></p><h3>Instalação</h3><ol><li>Clone o repositório</li><li>Configure as variáveis</li><li>Execute o serviço</li></ol><h2>Troubleshooting</h2><p>Problemas conhecidos e soluções.</p>`
  },
  {
    id: 3,
    name: "Relatório",
    description: "Template para relatórios periódicos e análises.",
    content: `<h1>Relatório</h1><h2>Resumo Executivo</h2><p>Síntese dos pontos principais.</p><h2>Métricas</h2><p>Apresente os dados e indicadores relevantes.</p><h2>Análise</h2><p>Interpretação dos resultados.</p><h2>Recomendações</h2><ul><li>Recomendação 1</li><li>Recomendação 2</li></ul><h2>Próximos Passos</h2><p>Ações a serem tomadas.</p>`
  },
  {
    id: 4,
    name: "Checklist de Onboarding",
    description: "Template para onboarding de novos clientes ou colaboradores.",
    content: `<h1>Checklist de Onboarding</h1><h2>Dados do Cliente</h2><p><strong>Nome:</strong> </p><p><strong>Empresa:</strong> </p><p><strong>Contato:</strong> </p><h2>Tarefas</h2><ul><li>[ ] Criar conta no sistema</li><li>[ ] Configurar integrações</li><li>[ ] Enviar credenciais de acesso</li><li>[ ] Agendar reunião de kickoff</li><li>[ ] Validar fluxos de automação</li></ul><h2>Observações</h2><p>Notas adicionais.</p>`
  }
];

export const DOCS_DATA = [
  { id:1,  title:"Como configurar webhook no GreatPages",      category:"Integrações", area:"TI",      status:"published", author:"Gabriel G.", tags:["webhook","GreatPages","n8n"],  updatedAt:"há 1h",   modifiedAt:"2026-06-01T18:00:00Z", type:"document", content:"<h1>Como configurar webhook no GreatPages</h1><h2>Introdução</h2><p>Este guia explica como configurar um webhook no GreatPages para integração com o n8n.</p><h2>Passo 1 — Acessar Configurações</h2><p>Acesse o painel do GreatPages e navegue até <strong>Integrações → Webhooks</strong>.</p><h2>Passo 2 — Criar Webhook</h2><p>Clique em <em>Novo Webhook</em> e insira a URL de produção do n8n.</p><ol><li>Copie a URL do webhook no n8n</li><li>Cole no campo de URL do GreatPages</li><li>Selecione os eventos desejados</li></ol><h2>Passo 3 — Testar</h2><p>Envie um formulário de teste e verifique se a execução aparece no n8n.</p>" },
  { id:2,  title:"Fluxo de disparos via n8n + WhatsApp",       category:"Automações",  area:"Cliente", status:"published", author:"Ricardo L.", tags:["n8n","WhatsApp","disparo"],    updatedAt:"há 3h",   modifiedAt:"2026-06-01T16:00:00Z", type:"document", content:"<h1>Fluxo de disparos via n8n + WhatsApp</h1><p>Documentação do fluxo de disparos em massa via n8n integrado com WhatsApp Business API.</p><h2>Arquitetura</h2><p>O fluxo utiliza o n8n como orquestrador, conectando-se à API do WhatsApp para envio de mensagens.</p><h2>Configuração</h2><ul><li>Token de acesso da API</li><li>Template de mensagem aprovado</li><li>Lista de contatos no CRM</li></ul>" },
  { id:3,  title:"Configurar token RD Station",                category:"Ferramentas", area:"TI",      status:"draft",     author:"Mariana T.", tags:["RD Station","token","API"],    updatedAt:"há 6h",   modifiedAt:"2026-06-01T13:00:00Z", type:"document", content:"<h1>Configurar token RD Station</h1><p><em>Rascunho — em construção</em></p><h2>Obtendo o Token</h2><p>Acesse RD Station → Configurações → Integrações → API e gere um novo token.</p>" },
  { id:4,  title:"Onboarding V4Chat — passo a passo",          category:"V4Chat",      area:"Cliente", status:"published", author:"Gabriel G.", tags:["V4Chat","onboarding"],         updatedAt:"há 2d",   modifiedAt:"2026-05-30T10:00:00Z", type:"document", content:"<h1>Onboarding V4Chat</h1><h2>Pré-requisitos</h2><ul><li>Acesso ao painel V4Chat</li><li>Número de WhatsApp configurado</li></ul><h2>Passo a Passo</h2><ol><li>Criar organização no V4Chat</li><li>Adicionar agentes</li><li>Configurar canais de atendimento</li><li>Integrar com Typebot (opcional)</li></ol>" },
  { id:5,  title:"Como criar fluxo no Typebot",                category:"Typebot",     area:"TI",      status:"published", author:"Ana C.",     tags:["Typebot","bot","fluxo"],       updatedAt:"há 3d",   modifiedAt:"2026-05-29T14:00:00Z", type:"document", content:"<h1>Como criar fluxo no Typebot</h1><p>Guia completo para criação de bots conversacionais no Typebot.</p><h2>Interface do Editor</h2><p>O Typebot usa um editor visual drag-and-drop para construção de fluxos.</p><h2>Blocos Disponíveis</h2><ul><li><strong>Text:</strong> Envia mensagem</li><li><strong>Input:</strong> Coleta dados</li><li><strong>Condition:</strong> Lógica condicional</li><li><strong>Webhook:</strong> Integração externa</li></ul>" },
  { id:6,  title:"Configuração inicial n8n",                   category:"n8n",         area:"TI",      status:"published", author:"Ricardo L.", tags:["n8n","configuração"],          updatedAt:"há 4d",   modifiedAt:"2026-05-28T09:00:00Z", type:"document", content:"<h1>Configuração inicial n8n</h1><p>Guia para setup e configuração inicial de uma instância n8n.</p><h2>Instalação via Docker</h2><p><code>docker run -d --name n8n -p 5678:5678 n8nio/n8n</code></p><h2>Variáveis de Ambiente</h2><p>Configure as variáveis no arquivo <code>.env</code>.</p>" },
  { id:7,  title:"Gestão de instâncias WhatsApp",              category:"Instâncias",  area:"TI",      status:"published", author:"Gabriel G.", tags:["WhatsApp","instância"],        updatedAt:"há 5d",   modifiedAt:"2026-05-27T11:00:00Z", type:"document", content:"<h1>Gestão de instâncias WhatsApp</h1><p>Procedimentos para gerenciamento das instâncias de WhatsApp dos clientes.</p><h2>Tipos de Instância</h2><ul><li><strong>V4Chat:</strong> Atendimento humano</li><li><strong>Disparo:</strong> Envio em massa</li><li><strong>Typebot:</strong> Chatbot automatizado</li></ul>" },
  { id:8,  title:"Procedimentos de emergência — automações",   category:"Processos",   area:"TI",      status:"published", author:"Ana C.",     tags:["emergência","erro"],           updatedAt:"há 1sem", modifiedAt:"2026-05-25T08:00:00Z", type:"document", content:"<h1>Procedimentos de Emergência</h1><h2>Automação com Erro Crítico</h2><ol><li>Identificar a automação no painel n8n</li><li>Pausar execuções futuras</li><li>Analisar logs de erro</li><li>Corrigir e reativar</li></ol><h2>Instância WhatsApp Desconectada</h2><ol><li>Verificar status no Evolution API</li><li>Reconectar via QR Code</li><li>Validar envio de teste</li></ol>" },
  { id:9,  title:"SLA de suporte técnico",                     category:"Processos",   area:"TI",      status:"published", author:"Gabriel G.", tags:["SLA","suporte"],               updatedAt:"há 2sem", modifiedAt:"2026-05-18T10:00:00Z", type:"document", content:"<h1>SLA de Suporte Técnico</h1><h2>Níveis de Prioridade</h2><ul><li><strong>Crítico:</strong> 1 hora para resposta</li><li><strong>Alto:</strong> 4 horas para resposta</li><li><strong>Médio:</strong> 24 horas para resposta</li><li><strong>Baixo:</strong> 48 horas para resposta</li></ul>" },
  { id:10, title:"Integração CRM com n8n — guia avançado",    category:"Integrações", area:"TI",      status:"draft",     author:"Mariana T.", tags:["CRM","n8n","integração"],     updatedAt:"há 3d",   modifiedAt:"2026-05-29T16:00:00Z", type:"document", content:"<h1>Integração CRM com n8n</h1><p><em>Rascunho — guia avançado</em></p><h2>Endpoints Utilizados</h2><p>Detalhamento dos endpoints da API do CRM.</p>" },
  { id:11, title:"V4Chat Analytics — como usar",               category:"V4Chat",      area:"Cliente", status:"published", author:"Ricardo L.", tags:["V4Chat","analytics"],          updatedAt:"há 1sem", modifiedAt:"2026-05-25T15:00:00Z", type:"document", content:"<h1>V4Chat Analytics</h1><p>Como utilizar o módulo de analytics do V4Chat para acompanhar métricas de atendimento.</p><h2>Dashboard</h2><p>O dashboard apresenta métricas em tempo real.</p>" },
  { id:12, title:"Configuração de disparos em massa",          category:"Automações",  area:"Cliente", status:"archived",  author:"Ana C.",     tags:["disparo","massa"],             updatedAt:"há 2mes", modifiedAt:"2026-04-01T12:00:00Z", type:"document", content:"<h1>Disparos em Massa</h1><p><em>Documento arquivado — procedimento atualizado no doc #2.</em></p>" },
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
