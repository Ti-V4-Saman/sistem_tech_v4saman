import { env } from './config/env.js';
import { createApp } from './http/app.js';
import { bootstrapAccessModel } from './modules/users/profile.service.js';

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
});
