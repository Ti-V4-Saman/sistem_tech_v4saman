require('dotenv').config();
const path = require('path');
const express = require('express');
const cron = require('node-cron');
const moduleExports = require('./module');
const {
  createBiRouter,
  triggerSync,
  initSchema,
  normalizeTicketDataInDb,
  getPool,
} = moduleExports;

const PORT = Number(process.env.PORT || 3000);
const CRON_SCHEDULE = process.env.SYNC_CRON || '0 * * * *';

async function startStandalone() {
  console.log('=== Inicializando Servidor BI & Coletor eKyte (Modo Standalone) ===');
  await initSchema();
  await normalizeTicketDataInDb();

  const app = express();
  app.use(express.json());

  // Monta o Router com todos os endpoints e arquivos estáticos
  const biRouter = createBiRouter({ serveStatic: true, cronSchedule: CRON_SCHEDULE });
  app.use(biRouter);

  app.listen(PORT, () => {
    console.log(`🚀 Dashboard BI disponível em: http://localhost:${PORT}`);
  });

  const pool = getPool();
  const [recentRuns] = await pool.query(`
    SELECT id, finished_at
    FROM sync_runs
    WHERE status = 'SUCCESS'
      AND finished_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 50 MINUTE)
    ORDER BY id DESC
    LIMIT 1
  `);

  if (!process.env.EKYTE_API_KEY) {
    console.warn('⚠️  Atenção: EKYTE_API_KEY ainda não definida no .env.');
  } else if (recentRuns.length === 0) {
    triggerSync('STARTUP').catch(() => {});
  } else {
    console.log(
      `ℹ️  Última sincronização (#${recentRuns[0].id}) concluída recentemente (${recentRuns[0].finished_at.toISOString()}). Próxima coleta no ciclo de 1h.`
    );
  }

  cron.schedule(CRON_SCHEDULE, () => {
    console.log(`[Scheduler] Disparando coleta agendada (${CRON_SCHEDULE})...`);
    triggerSync('HOURLY').catch(() => {});
  });

  console.log(`✅ Agendador ativo! Coleta configurada para rodar a cada 1 hora (${CRON_SCHEDULE}).`);
}

// Se executado diretamente (node src/index.js ou npm start)
if (require.main === module) {
  startStandalone().catch((err) => {
    console.error('Erro fatal ao iniciar serviço:', err);
    process.exit(1);
  });
}

// Quando importado como módulo por outro sistema
module.exports = moduleExports;
