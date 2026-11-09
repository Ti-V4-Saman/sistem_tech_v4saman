require('dotenv').config();
const cron = require('node-cron');
const { configureDb, getPool, ensureDatabase } = require('./db');
const { initSchema } = require('./schema');
const { runFullSync } = require('./sync');
const {
  BRIU_EXECUTORS,
  normalizeTicketDataInDb,
  getFilterMetadata,
  getDashboardData,
  getPaginatedTickets,
  getTicketDetail,
} = require('./analytics');
const {
  createBiRouter,
  triggerSync,
  getIsSyncRunning,
  getLastSyncError,
} = require('./routes');

/**
 * Cria e inicializa o módulo eKyte BI para ser montado em qualquer aplicação Express existente.
 *
 * Exemplo de uso:
 * ```javascript
 * const { createEkyteBiModule } = require('./api-ekyte');
 *
 * const biModule = await createEkyteBiModule({
 *   cronSchedule: '0 * * * *', // ou false para desativar cron
 *   serveStatic: true,
 * });
 *
 * app.use('/ekyte-bi', biModule.router);
 * ```
 */
async function createEkyteBiModule(options = {}) {
  // 1. Configura banco se options forem passadas
  if (options.dbConfig || options.pool || options.database) {
    configureDb(options);
  }

  // 2. Garante schema e normalização de dados
  if (options.autoInit !== false) {
    try {
      await ensureDatabase();
      await initSchema();
      await normalizeTicketDataInDb();
    } catch (err) {
      console.error('[Ekyte BI Module] Aviso ao inicializar banco de dados:', err.message);
    }
  }

  // 3. Cria o router Express
  const router = createBiRouter(options);

  // 4. Configura cron se solicitado (padrão ativo a cada 1 hora)
  let cronJob = null;
  const cronSchedule = options.cronSchedule !== undefined ? options.cronSchedule : (process.env.SYNC_CRON || '0 * * * *');
  if (cronSchedule && typeof cronSchedule === 'string') {
    cronJob = cron.schedule(cronSchedule, () => {
      console.log(`[Ekyte BI Module] Disparando coleta agendada (${cronSchedule})...`);
      triggerSync('HOURLY').catch(() => {});
    });
    console.log(`[Ekyte BI Module] Agendador ativo (${cronSchedule}).`);
  }

  // 5. Disparo opcional na inicialização
  if (options.syncOnStartup) {
    triggerSync('STARTUP').catch(() => {});
  }

  return {
    router,
    triggerSync,
    cronJob,
    getPool,
    stopCron: () => {
      if (cronJob) cronJob.stop();
    },
  };
}

module.exports = {
  createEkyteBiModule,
  createBiRouter,
  triggerSync,
  getIsSyncRunning,
  getLastSyncError,
  initSchema,
  runFullSync,
  normalizeTicketDataInDb,
  configureDb,
  getPool,
  BRIU_EXECUTORS,
  analytics: {
    getFilterMetadata,
    getDashboardData,
    getPaginatedTickets,
    getTicketDetail,
    normalizeTicketDataInDb,
  },
};

