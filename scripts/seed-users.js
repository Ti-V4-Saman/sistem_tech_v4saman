import dotenv from 'dotenv';
import { hashPassword } from '../backend/src/utils/crypto.js';
import { query } from '../backend/src/db/pool.js';
import {
  bootstrapAccessModel,
  assignAccessRole,
  upsertUserProfile,
} from '../backend/src/modules/users/profile.service.js';
import { createId } from '../backend/src/utils/id.js';

// Load environment variables
dotenv.config({ quiet: true });

const DEFAULT_PASSWORD = 'v4company@2026';

const USERS_LIST = [
  {
    name: 'Vitor Gustavo Cursino',
    email: 'vitor.gustavo@v4company.com',
    cargo: 'designer',
    squad: 'seals'
  },
  {
    name: 'Eduardo Emiliano de Araújo Braga',
    email: 'eduardo.braga@v4company.com',
    cargo: 'gerente-pe-g',
    squad: 'atlas'
  },
  {
    name: 'PAULO CESAR DEMARIO DA COSTA',
    email: 'paulo.cesar@v4company.com',
    cargo: 'closer',
    squad: 'balboa'
  },
  {
    name: 'Mateus Barreto Dos Santos Teixeira',
    email: 'mateus.barreto@v4company.com',
    cargo: 'gestor-trafego',
    squad: 'snipers'
  },
  {
    name: 'Thiago Henrique Oliveira',
    email: 'thiago.oliveira@v4company.com',
    cargo: 'gestor-projetos',
    squad: 'snipers'
  },
  {
    name: 'Paulo Antonio Neves Sarmento',
    email: 'paulo.neves@v4company.com',
    cargo: 'analista-recebimento',
    squad: 'atlas'
  },
  {
    name: 'Geraldo Augusto Chaves Paim',
    email: 'geraldo.paim@v4company.com',
    cargo: 'copy',
    squad: 'snipers'
  },
  {
    name: 'Michel Angelo dos Reis',
    email: 'michelangelo.dos@v4company.com',
    cargo: 'designer',
    squad: 'snipers'
  },
  {
    name: 'Sandro Carlos Silva',
    email: 'sandro.silva@v4company.com',
    cargo: 'bdr',
    squad: 'balboa'
  },
  {
    name: 'Graciane Teixeira de Carvalho',
    email: 'graciane.teixeira@v4company.com',
    cargo: 'bdr',
    squad: 'balboa'
  },
  {
    name: 'Filipe Moreira Chácara',
    email: 'filipe.chacara@v4company.com',
    cargo: 'copy',
    squad: 'seals'
  },
  {
    name: 'Ana Laura Vieira Hilário',
    email: 'ana.viaira@v4company.com', // Mantido o e-mail antigo aqui para o script achar e rodar o UPDATE correto se necessário, ou criar o novo.
    cargo: 'designer',
    squad: 'seals'
  }
];

async function run() {
  console.log('🚀 Iniciando semeadura do segundo lote de usuários...');

  try {
    const organization = await bootstrapAccessModel();
    console.log(`🏢 Organização padrão garantida: ${organization.name} (ID: ${organization.id})`);

    const passwordHash = await hashPassword(DEFAULT_PASSWORD);

    // 1. Purge/Limpeza do e-mail com typo caso queira deletar e recriar com o e-mail certo
    // Como no USERS_LIST acima mapeamos a Ana Laura para 'ana.viaira' para atualizar via script,
    // se você rodar o DELETE abaixo, ela some e o loop a recria. 
    // Se preferir rodar a correção do e-mail da Ana Laura direto para 'ana.viaira' -> 'ana.viaira', o script resolve.
    // Mas vamos rodar a query corretiva padrão:
    await query(`DELETE FROM users WHERE email = ?`, ['ana.viaira@v4company.com']);
    console.log('🧹 Limpeza concluída: removido usuário com e-mail incorreto se existente.');

    // Corrigindo o objeto da Ana Laura na memória para inserir com o e-mail certo pós-limpeza
    const anaLaura = USERS_LIST.find(u => u.name === 'Ana Laura Vieira Hilário');
    if (anaLaura) {
      anaLaura.email = 'ana.viaira@v4company.com';
      // Se no banco atual está cadastrado 'ana.viaira', mudamos aqui para 'ana.viaira' para deletar na linha de cima 
      // e reinserir abaixo como 'ana.viaira' (o correto da imagem).
      anaLaura.email = 'ana.vieira@v4company.com';
    }

    // 2. Loop para inserir e configurar cada usuário
    for (const u of USERS_LIST) {
      const emailLower = u.email.trim().toLowerCase();
      console.log(`👤 Processando usuário: ${u.name} <${emailLower}>`);

      // Upsert na tabela 'users'
      await query(
        `INSERT INTO users (id, organization_id, name, email, password_hash, status)
         VALUES (?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           status = 'active',
           updated_at = CURRENT_TIMESTAMP`,
        [createId(), organization.id, u.name, emailLower, passwordHash]
      );

      // Busca ID do usuário de forma segura (tratando retorno com .rows ou direto como array)
      const userResult = await query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [emailLower]);
      const rows = userResult.rows || userResult[0] || userResult;

      if (!rows || rows.length === 0) {
        console.error(`❌ Erro: Não foi possível resgatar o ID gerado para o e-mail ${emailLower}`);
        continue;
      }

      const userId = rows[0]?.id || rows.id;

      // Atribui acesso 'user' por padrão para estes 12
      const roleSlug = 'user';
      await assignAccessRole(userId, organization.id, roleSlug);

      // Atualiza o perfil vinculando cargo e squad
      await upsertUserProfile(userId, organization.id, {
        jobRoleSlug: u.cargo,
        teamSlug: u.squad
      });

      console.log(`   ✅ Sucesso! Cargo: [${u.cargo}], Squad: [${u.squad}], Acesso: [${roleSlug}]`);
    }

    console.log(`\n🎉 Semeadura do segundo lote concluída! ${USERS_LIST.length} usuários pré-configurados.`);
    console.log(`🔑 Senha inicial padrão: ${DEFAULT_PASSWORD}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO ao rodar seeder:', err);
    process.exit(1);
  }
}

run();