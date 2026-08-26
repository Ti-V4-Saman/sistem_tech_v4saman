import dotenv from 'dotenv';
import { hashPassword } from '../backend/src/utils/crypto.js';
import { query } from '../backend/src/db/pool.js';
import {
  bootstrapAccessModel,
  assignAccessRole,
  assertCompanyEmail,
  getUserViewById,
  upsertUserProfile,
} from '../backend/src/modules/users/profile.service.js';
import { createId } from '../backend/src/utils/id.js';

// Carrega as variáveis do arquivo .env
dotenv.config({ quiet: true });

// Configurações do administrador vindas das variáveis de ambiente (ou usando valores padrão)
const adminName = process.env.SEED_ADMIN_NAME || 'Admin TechHub';
// Garante que o e-mail seja corporativo (v4company.com por padrão ou configurado no allowedDomain)
const adminEmail = assertCompanyEmail(process.env.SEED_ADMIN_EMAIL || 'admin@v4company.com');
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

// A senha do admin inicial é obrigatória para executar este script
if (!adminPassword) {
  console.error('❌ ERRO: A variável SEED_ADMIN_PASSWORD é obrigatória no arquivo .env.');
  process.exit(1);
}

// 1. Cria ou garante a existência da Organização padrão, cargos do time, dimensões de pessoas,
//    cria as permissões do RBAC (Role-Based Access Control) e insere na tabela correspondente.
const organization = await bootstrapAccessModel();

// 2. Gera o hash seguro da senha fornecida usando bcrypt/criptografia nativa
const passwordHash = await hashPassword(adminPassword);

// 3. Insere o usuário na tabela 'users' se não existir. Se já existir (e-mail duplicado),
//    atualiza a senha, o nome e garante que o status esteja ativo.
await query(
  `INSERT INTO users (id, organization_id, name, email, password_hash, status)
   VALUES (?, ?, ?, ?, ?, 'active')
   ON DUPLICATE KEY UPDATE
     name = VALUES(name),
     password_hash = VALUES(password_hash),
     status = 'active',
     updated_at = CURRENT_TIMESTAMP`,
  [createId(), organization.id, adminName, adminEmail, passwordHash]
);

// 4. Busca o ID do usuário criado ou existente
const user = await query(`SELECT id, email FROM users WHERE email = ? LIMIT 1`, [adminEmail]);
const userId = user.rows[0].id;

// 5. Atribui a regra de "super-admin" para o usuário nesta organização (acesso completo)
await assignAccessRole(userId, organization.id, 'super-admin');

// 6. Atualiza ou insere o perfil do usuário vinculando-o ao cargo e time definidos nas variáveis de ambiente
await upsertUserProfile(userId, organization.id, {
  jobRoleSlug: process.env.SEED_ADMIN_JOB_ROLE || 'gerente',
  teamSlug: process.env.SEED_ADMIN_TEAM || 'snipers',
});

// 7. Retorna e imprime no console as informações finais do administrador criado para validação
const view = await getUserViewById(userId);
console.log(`✅ Administrador pronto: ${view.email} (${view.access_role_name} / ${view.job_role_name} / ${view.team_name})`);
process.exit(0);
