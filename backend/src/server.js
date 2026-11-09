import { createRequire } from 'module';
import cron from 'node-cron';
import { env } from './config/env.js';
import { createApp } from './http/app.js';
import { bootstrapAccessModel } from './modules/users/profile.service.js';
import { syncExternalData } from './modules/integrations/sync.service.js';

const require = createRequire(import.meta.url);
const {
  initSchema,
  normalizeTicketDataInDb,
  triggerSync,
  getPool,
} = require('../../api-ekyte/src/module.js');

const app = createApp();

app.listen(env.port, async () => {
  console.log(`TechOps API running on http://localhost:${env.port}`);

  try {
    console.log('[bootstrap] Inicializando modelo de acessos e permissões no banco...');
    await bootstrapAccessModel();
    console.log('[bootstrap] Modelo de acessos carregado com sucesso.');
  } catch (err) {
    console.error('[bootstrap] Erro ao inicializar modelo de acessos:', err.message);
  }

  // Inicialização e agendamento do módulo eKyte BI (Time BRIU)
  try {
    console.log('[ekyte-bi] Inicializando tabelas e normalizações no banco ekyte_bi...');
    await initSchema();
    await normalizeTicketDataInDb();
    console.log('[ekyte-bi] Banco ekyte_bi inicializado com sucesso.');

    const ekyteCron = process.env.SYNC_CRON || '0 * * * *';
    cron.schedule(ekyteCron, () => {
      console.log(`[ekyte-bi] Disparando coleta agendada horária (${ekyteCron})...`);
      triggerSync('HOURLY').catch((err) => {
        console.error('[ekyte-bi] Erro na sincronização horária:', err.message);
      });
    });
    console.log(`[ekyte-bi] Coleta horária do eKyte agendada para rodar (${ekyteCron}).`);

    // Verificação de sincronização no startup se não houver recente
    if (process.env.EKYTE_API_KEY) {
      try {
        const pool = getPool();
        const [recentRuns] = await pool.query(`
          SELECT id, finished_at
          FROM sync_runs
          WHERE status = 'SUCCESS'
            AND finished_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 50 MINUTE)
          ORDER BY id DESC
          LIMIT 1
        `);

        if (recentRuns.length === 0) {
          console.log('[ekyte-bi] Nenhuma sincronização recente encontrada. Iniciando primeira coleta em segundo plano...');
          triggerSync('STARTUP').catch((err) => {
            console.error('[ekyte-bi] Falha na coleta inicial de startup:', err.message);
          });
        } else {
          console.log(`[ekyte-bi] Última sincronização recente (#${recentRuns[0].id}) encontrada. Próxima coleta no ciclo de 1h.`);
        }
      } catch (checkErr) {
        console.warn('[ekyte-bi] Aviso ao verificar syncs recentes:', checkErr.message);
      }
    } else {
      console.warn('[ekyte-bi] Aviso: EKYTE_API_KEY não definida no .env');
    }
  } catch (ekyteErr) {
    console.error('[ekyte-bi] Erro ao inicializar módulo eKyte BI:', ekyteErr.message);
  }

  // Sincronização em segundo plano das integrações a cada 1 minuto
  console.log('[sync] Iniciando agendamento de sincronização (1 minuto)...');
  setInterval(async () => {
    try {
      await syncExternalData();
    } catch (err) {
      console.error('[sync] Erro na sincronização automática:', err.message);
    }
  }, 60 * 1000);
});
