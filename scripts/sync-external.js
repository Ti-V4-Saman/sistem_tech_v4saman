import dotenv from 'dotenv';
import { syncExternalData } from '../backend/src/modules/integrations/sync.service.js';

dotenv.config({ quiet: true });

async function main() {
  console.log('🔄 Iniciando sincronização externa do TechHub...');
  const result = await syncExternalData();

  if (result.n8n?.error) {
    console.error(`❌ n8n: ${result.n8n.error}`);
  } else if (result.n8n?.configured === false) {
    console.warn('⚠️ n8n não configurado no .env.');
  } else {
    console.log(`✅ n8n: ${result.n8n.synced} automações, ${result.n8n.clients} clientes vinculados, ${result.n8n.runs} execuções salvas.`);
  }

  if (result.typebot?.error) {
    console.error(`❌ Typebot: ${result.typebot.error}`);
  } else if (result.typebot?.configured === false) {
    console.warn('⚠️ Typebot não configurado no .env.');
  } else {
    console.log(`✅ Typebot: ${result.typebot.synced} bots, ${result.typebot.clients} clientes vinculados.`);
  }

  console.log('🏁 Processo de sincronização finalizado.');
  process.exit(result.n8n?.error || result.typebot?.error ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Erro inesperado na sincronização:', error);
  process.exit(1);
});
