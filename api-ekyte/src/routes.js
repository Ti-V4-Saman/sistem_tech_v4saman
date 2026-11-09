const path = require('path');
const express = require('express');
const { getPool } = require('./db');
const { runFullSync } = require('./sync');
const {
  normalizeTicketDataInDb,
  getFilterMetadata,
  getDashboardData,
  getPaginatedTickets,
  getTicketDetail,
} = require('./analytics');

let isSyncRunning = false;
let lastSyncError = null;

async function triggerSync(runType = 'MANUAL') {
  if (isSyncRunning) {
    console.log(`[Ekyte BI] Sincronização já está em andamento. Ignorando disparo (${runType}).`);
    return { alreadyRunning: true };
  }
  isSyncRunning = true;
  lastSyncError = null;
  try {
    const summary = await runFullSync(runType);
    await normalizeTicketDataInDb();
    return { alreadyRunning: false, summary };
  } catch (err) {
    lastSyncError = err.message;
    console.error(`[Ekyte BI] Falha na execução (${runType}):`, err.message);
    throw err;
  } finally {
    isSyncRunning = false;
  }
}

function createBiRouter(options = {}) {
  const router = express.Router();
  const serveStatic = options.serveStatic !== false;
  const cronSchedule = options.cronSchedule || process.env.SYNC_CRON || '0 * * * *';

  // Middleware para JSON caso não tenha sido adicionado globalmente
  router.use(express.json());

  // Status de sincronização
  router.get('/api/bi/sync-status', async (req, res) => {
    try {
      const pool = getPool();
      const [runs] = await pool.query(
        `SELECT id, run_type, started_at, finished_at, status, endpoints_summary, total_records_upserted, total_changes_logged, error_message
         FROM sync_runs
         ORDER BY id DESC
         LIMIT 10`
      );
      res.json({
        isSyncRunning,
        lastSyncError,
        cronSchedule,
        runs,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Disparo manual de sincronização
  router.post('/api/bi/sync-now', async (req, res) => {
    try {
      if (isSyncRunning) {
        return res.json({ status: 'RUNNING', message: 'Sincronização já está em execução.' });
      }
      triggerSync('MANUAL_DASHBOARD').catch(() => {});
      res.json({ status: 'STARTED', message: 'Sincronização iniciada em segundo plano.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Opções de filtros dinâmicos
  router.get('/api/bi/filters', async (req, res) => {
    try {
      const meta = await getFilterMetadata(req.query);
      res.json({ ...meta, isSyncRunning });
    } catch (err) {
      console.error('[Ekyte BI] Erro em /api/bi/filters:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Dados completos do Dashboard BI cruzado
  router.get('/api/bi/dashboard', async (req, res) => {
    try {
      const data = await getDashboardData(req.query);
      res.json(data);
    } catch (err) {
      console.error('[Ekyte BI] Erro em /api/bi/dashboard:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Lista paginada de tickets para tabela
  router.get('/api/bi/tickets', async (req, res) => {
    try {
      const data = await getPaginatedTickets(req.query);
      res.json(data);
    } catch (err) {
      console.error('[Ekyte BI] Erro em /api/bi/tickets:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Exportação de CSV de tickets filtrados
  router.get('/api/bi/tickets/export', async (req, res) => {
    try {
      const data = await getPaginatedTickets({ ...req.query, page: 1, pageSize: 10000 });
      const items = data.items || [];

      const headers = [
        'ID',
        'Assunto',
        'Workspace',
        'Squad',
        'Executor',
        'Solicitante',
        'Etapa',
        'Urgência',
        'Status',
        'SLA',
        'Aberto Em',
        'Prazo Previsto',
        'Prazo Original',
        'Prazo Alterado',
        'Concluído Em',
        'Lead Time (min)',
        'Horas Apontadas (min)',
        'Link eKyte',
      ];

      const escapeCsv = (v) => {
        if (v === null || v === undefined) return '""';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      };

      const csvRows = [
        headers.join(';'),
        ...items.map((t) =>
          [
            t.id,
            escapeCsv(t.subject),
            escapeCsv(t.workspace),
            escapeCsv(t.squad),
            escapeCsv(t.executor),
            escapeCsv(t.requester_by),
            escapeCsv(t.phase),
            escapeCsv(t.priority_label),
            escapeCsv(t.status_label),
            escapeCsv(t.overdue_status),
            escapeCsv(t.created_in ? new Date(t.created_in).toISOString() : ''),
            escapeCsv(t.expect_due_date ? new Date(t.expect_due_date).toISOString() : ''),
            escapeCsv(t.initial_expect_due_date ? new Date(t.initial_expect_due_date).toISOString() : ''),
            t.is_due_date_altered ? 'SIM' : 'NAO',
            escapeCsv(t.concluded_in ? new Date(t.concluded_in).toISOString() : ''),
            t.lead_time_minutes || 0,
            t.actual_time || t.time_tracked_sum || 0,
            escapeCsv(t.link),
          ].join(';')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="tickets-briu.csv"');
      res.send('\uFEFF' + csvRows.join('\r\n'));
    } catch (err) {
      console.error('[Ekyte BI] Erro ao exportar CSV:', err);
      res.status(500).send('Erro ao exportar CSV: ' + err.message);
    }
  });

  // Detalhe de um ticket específico
  router.get('/api/bi/tickets/:id', async (req, res) => {
    try {
      const detail = await getTicketDetail(req.params.id);
      if (!detail) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
      }
      res.json(detail);
    } catch (err) {
      console.error('[Ekyte BI] Erro em /api/bi/tickets/:id:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Arquivos estáticos do Dashboard Frontend
  if (serveStatic) {
    const publicPath = path.join(__dirname, '..', 'public');
    router.use(express.static(publicPath));
    router.get('/', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  return router;
}

module.exports = {
  createBiRouter,
  triggerSync,
  getIsSyncRunning: () => isSyncRunning,
  getLastSyncError: () => lastSyncError,
};

