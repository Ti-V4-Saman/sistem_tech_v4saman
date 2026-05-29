import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10, // número máximo de conexões no pool
  idleTimeoutMillis: 30000,
});

pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente do pool PostgreSQL:', err);
});

pool.connect()
  .then(() => console.log('✅ Conectado ao PostgreSQL (n8n) via Pool'))
  .catch(err => console.error('Erro ao conectar no banco:', err));

const typebotPool = new Pool({
  host: process.env.TYPEBOT_DB_HOST,
  port: process.env.TYPEBOT_DB_PORT,
  user: process.env.TYPEBOT_DB_USER,
  password: process.env.TYPEBOT_DB_PASSWORD,
  database: process.env.TYPEBOT_DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
});

typebotPool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente do pool Typebot:', err);
});

typebotPool.connect()
  .then(() => console.log('✅ Conectado ao PostgreSQL (Typebot) via Pool'))
  .catch(err => console.error('Erro ao conectar no banco Typebot:', err));


// Endpoint para buscar os dados do dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    // --- 1. Queries do n8n ---
    console.time('n8nQuery');
    const queryWorkflows = `
      SELECT 
        w.id as workflow_id,
        w.name as workflow_name,
        w.active as is_active,
        t.name as tag_name
      FROM workflow_entity w
      JOIN workflows_tags wt ON w.id = wt."workflowId"
      JOIN tag_entity t ON t.id = wt."tagId"
      WHERE t.name NOT IN (
        'Cliente', 'Envio Relatorio', 'Envio Relatório', 'Facebook Ads', 
        'error-notification', 'Feejo', 'Performance', 'Jony ai', 'Jony AI'
      )
    `;
    
    // Busca as últimas 10 execuções de cada workflow, limitando a busca aos últimos 7 dias para evitar travamentos
    const queryExecutions = `
      SELECT id, status, "workflowId"
      FROM (
        SELECT id, status, "workflowId",
               ROW_NUMBER() OVER(PARTITION BY "workflowId" ORDER BY id DESC) as rn
        FROM execution_entity
        WHERE "startedAt" >= NOW() - INTERVAL '7 days'
      ) t
      WHERE rn <= 10
    `;
    
    const [workflowsResult, executionsResult] = await Promise.all([
      pool.query(queryWorkflows),
      pool.query(queryExecutions)
    ]);
    
    const rows = workflowsResult.rows;
    const execRows = executionsResult.rows;

    const executionsMap = new Map();
    execRows.forEach(exec => {
       const wId = exec.workflowId;
       if (!executionsMap.has(wId)) executionsMap.set(wId, []);
       executionsMap.get(wId).push({ id: exec.id, status: exec.status });
    });
    
    console.timeEnd('n8nQuery');

    // Processamento: Mapear por cliente e contar automações ativas
    const clientsMap = new Map();
    let activeAutomations = 0;

    rows.forEach(row => {
      // Conta total de workflows ativos globais do n8n
      if (row.is_active) {
        activeAutomations++;
      }

      // A tag_name restante representa o Cliente
      const clientName = row.tag_name;
      if (!clientsMap.has(clientName)) {
        clientsMap.set(clientName, {
          id: clientName, // Usamos o próprio nome como ID único
          name: clientName,
          company: "Cliente n8n", // Default fallback
          status: "inactive",
          tools: ["n8n"], // Por vir do banco do n8n
          activeWorkflows: 0,
          totalWorkflows: 0,
          workflows: []
        });
      }

      // Adiciona as execuções e o workflow ao cliente
      row.executions = executionsMap.get(row.workflow_id) || [];
      const clientData = clientsMap.get(clientName);
      clientData.totalWorkflows++;
      clientData.workflows.push(row);
      
      if (row.is_active) {
        clientData.activeWorkflows++;
      }
    });

    // --- 2. Integração Typebot ---
    console.time('typebotQuery');
    try {
      const [typebotResult, publicTypebotResult] = await Promise.all([
        typebotPool.query(`
          SELECT 
            f.id as folder_id,
            f.name as folder_name,
            t.id as typebot_id,
            t.name as typebot_name,
            t."publicId"
          FROM "DashboardFolder" f
          LEFT JOIN "Typebot" t ON t."folderId" = f.id AND t."isArchived" = false
          WHERE f.name NOT IN ('New folder', 'Temas', 'FAVOR CRIAR UMA PASTA PARA CADA CLIENTE', 'TESTES', 'Validadores')
        `),
        typebotPool.query(`SELECT "typebotId" FROM "PublicTypebot"`)
      ]);
      console.timeEnd('typebotQuery');

      const publicTypebotIds = new Set(publicTypebotResult.rows.map(r => r.typebotId));
      const typebotRows = typebotResult.rows;

      typebotRows.forEach(row => {
        const clientName = row.folder_name;
        
        if (!clientsMap.has(clientName)) {
          clientsMap.set(clientName, {
            id: clientName,
            name: clientName,
            company: "Cliente Typebot",
            status: "active",
            tools: ["Typebot"],
            activeWorkflows: 0,
            totalWorkflows: 0,
            workflows: [],
            typebots: []
          });
        }
        
        const clientData = clientsMap.get(clientName);
        if (!clientData.tools.includes("Typebot")) {
           clientData.tools.push("Typebot");
        }
        if (!clientData.typebots) {
           clientData.typebots = [];
        }
        
        // Se tiver fluxo associado, insere no array
        if (row.typebot_id) {
          // Evita duplicatas se a query retornar a mesma linha (caso raro, mas boa prática)
          if (!clientData.typebots.some(t => t.id === row.typebot_id)) {
            const isActive = publicTypebotIds.has(row.typebot_id);
            clientData.typebots.push({
              id: row.typebot_id,
              name: row.typebot_name,
              publicId: row.publicId,
              url: isActive && row.publicId ? `https://viewer.v4saman.com/${row.publicId}` : null,
              status: isActive ? 'active' : 'inactive'
            });
          }
        }
      });
    } catch (err) {
      console.error("Erro ao buscar pastas do Typebot:", err.message);
    }


    let totalActiveTypebots = 0;
    
    // 1. Adoção de Ferramentas
    let onlyN8n = 0;
    let onlyTypebot = 0;
    let both = 0;

    // 2. Saúde de Execuções
    let totalSuccess = 0;
    let totalError = 0;

    const clientsArray = Array.from(clientsMap.values()).map(c => {
      const activeTypebots = c.typebots ? c.typebots.filter(t => t.status === 'active').length : 0;
      c.activeTypebots = activeTypebots;
      c.totalTypebots = c.typebots ? c.typebots.length : 0;
      
      totalActiveTypebots += activeTypebots;

      c.status = (c.activeWorkflows > 0 || activeTypebots > 0) ? "active" : "inactive";
      
      const hasN8n = c.activeWorkflows > 0;
      const hasTypebot = activeTypebots > 0;
      if (hasN8n && hasTypebot) both++;
      else if (hasN8n) onlyN8n++;
      else if (hasTypebot) onlyTypebot++;

      if (c.workflows) {
        c.workflows.forEach(w => {
          if (w.executions && w.executions.length > 0) {
             w.executions.forEach(e => {
                 if (e.status === 'success') totalSuccess++;
                 if (e.status === 'error') totalError++;
             });
          }
        });
      }

      return c;
    });
    
    // Consideramos "Cliente Ativo" aquele que tem pelo menos 1 workflow ativo rodando
    const activeClients = clientsArray.filter(c => c.status === "active").length;

    // 3. Top Clientes (Ranking de Volume de Integrações)
    const topClients = [...clientsArray]
      .map(c => ({
        name: c.name,
        n8n: c.activeWorkflows || 0,
        Typebot: c.activeTypebots || 0,
        total: (c.activeWorkflows || 0) + (c.activeTypebots || 0)
      }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      activeClients,
      activeAutomations,
      activeBots: totalActiveTypebots,
      charts: {
        topClients,
        health: [
          { name: 'Sucesso', value: totalSuccess, fill: 'var(--success)' },
          { name: 'Erro', value: totalError, fill: 'var(--danger)' }
        ],
        adoption: [
          { name: 'Somente n8n', value: onlyN8n, fill: 'var(--color-primary)' },
          { name: 'Somente Typebot', value: onlyTypebot, fill: 'var(--rose-500)' },
          { name: 'Ambas (n8n + Typebot)', value: both, fill: 'var(--neutral-fg-high-contrast)' }
        ]
      },
      clientsDetail: clientsArray
    });

  } catch (error) {
    console.error("Erro na query do banco:", error);
    res.status(500).json({ error: 'Erro interno ao buscar dados do banco' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta http://localhost:${PORT}`);
});
