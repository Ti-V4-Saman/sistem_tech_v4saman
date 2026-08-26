import { query, getConnection } from '../../db/pool.js';
import { createId } from '../../utils/id.js';
import { HttpError } from '../../utils/http.js';
import { env } from '../../config/env.js';

export const COMPANY_DOMAIN = 'v4company.com';
export const DEFAULT_ORG = {
  name: 'V4 Company',
  slug: 'v4company',
};

export const TEAM_OPTIONS = [
  { slug: 'atlas', name: 'Atlas' },
  { slug: 'balboa', name: 'Balboa' },
  { slug: 'briu', name: 'Briu' },
  { slug: 'genius', name: 'Genius' },
  { slug: 'seals', name: 'Seals' },
  { slug: 'snipers', name: 'Snipers' },
  { slug: 'diretoria', name: 'Diretoria' },
  { slug: 'gerencia', name: 'Gerência' },
];

export const JOB_ROLE_OPTIONS = [
  { slug: 'account-manager', name: 'Account Manager' },
  { slug: 'analista-pagamento', name: 'Analista de Pagamento' },
  { slug: 'analista-recebimento', name: 'Analista de Recebimento' },
  { slug: 'closer', name: 'Closer' },
  { slug: 'coordenador-administrativo', name: 'Coordenador Administrativo' },
  { slug: 'coordenador-pe-g', name: 'Coordenador de PE&G' },
  { slug: 'coordenador-receitas', name: 'Coordenador de Receitas' },
  { slug: 'copywriter', name: 'Copywriter' },
  { slug: 'cs-cx', name: 'CS/CX' },
  { slug: 'desenvolvedor', name: 'Desenvolvedor' },
  { slug: 'designer', name: 'Designer' },
  { slug: 'diretor-pe-g', name: 'Diretor PE&G' },
  { slug: 'gerente-pe-g', name: 'Gerente PE&G' },
  { slug: 'gestor-projetos', name: 'Gestor de Projetos' },
  { slug: 'gestor-trafego', name: 'Gestor de Tráfego' },
  { slug: 'hrbp', name: 'HRBP' },
  { slug: 'kam-csm', name: 'KAM/CSM' },
  { slug: 'social-media', name: 'Social Media' },
  { slug: 'talent-acquisition', name: 'Talent Acquisition' },
  { slug: 'techops', name: 'TECHOPS' },
  { slug: 'analista-recursos-humanos', name: 'Analista de Recursos Humanos' },
  { slug: 'bdr', name: 'BDR' },
  { slug: 'diretor-regional', name: 'Diretor Regional' },
  { slug: 'copy', name: 'Copy' },
];

export const SENIORITY_OPTIONS = [
  { slug: 'auxiliar-l1', name: 'Auxiliar L1' },
  { slug: 'especialista', name: 'Especialista' },
  { slug: 'junior-l1', name: 'Júnior L1' },
  { slug: 'junior-l2', name: 'Júnior L2' },
  { slug: 'junior-l3', name: 'Júnior L3' },
  { slug: 'junior-l4', name: 'Júnior L4' },
  { slug: 'pleno-l1', name: 'Pleno L1' },
  { slug: 'pleno-l2', name: 'Pleno L2' },
  { slug: 'pleno-l3', name: 'Pleno L3' },
  { slug: 'pleno-l4', name: 'Pleno L4' },
  { slug: 'senior-l1', name: 'Sênior L1' },
  { slug: 'senior-l2', name: 'Sênior L2' },
  { slug: 'senior-l3', name: 'Sênior L3' },
  { slug: 'senior-l4', name: 'Sênior L4' },
];

export const AREA_OPTIONS = [
  { slug: 'administrativo', name: 'Administrativo' },
  { slug: 'dados', name: 'Dados' },
  { slug: 'direcao', name: 'Direção' },
  { slug: 'facilities', name: 'Facilities' },
  { slug: 'financeiro', name: 'Financeiro' },
  { slug: 'gerencia', name: 'Gerência' },
  { slug: 'gestao', name: 'Gestão' },
  { slug: 'juridico', name: 'Jurídico' },
  { slug: 'marketing', name: 'Marketing' },
  { slug: 'operacao', name: 'Operação' },
  { slug: 'p-p', name: 'P&P' },
  { slug: 'receita', name: 'Receita' },
  { slug: 'tecnologia', name: 'Tecnologia' },
];

export const BUSINESS_UNIT_OPTIONS = [
  { slug: 'aquisicao', name: 'Aquisição' },
  { slug: 'area-meio', name: 'Área Meio' },
  { slug: 'expansao', name: 'Expansão' },
  { slug: 'operacao', name: 'Operação' },
];

export const ACCESS_ROLE_OPTIONS = [
  {
    slug: 'super-admin',
    name: 'Super Admin',
    description: 'Acesso total ao sistema',
    permissions: ['*'],
  },
  {
    slug: 'admin',
    name: 'Admin',
    description: 'Administra dados operacionais e usuários',
    permissions: [
      'dashboard.view',
      'clients.view', 'clients.create', 'clients.update', 'clients.delete',
      'tools.view', 'tools.create', 'tools.update',
      'credentials.view_metadata', 'credentials.create', 'credentials.update', 'credentials.audit',
      'automations.view', 'automations.sync', 'automations.update_status',
      'instances.view',
      'docs.view', 'docs.create', 'docs.update', 'docs.publish', 'docs.archive',
      'tickets.view', 'tickets.create', 'tickets.assign', 'tickets.update', 'tickets.close',
      'incidents.view', 'incidents.create',
      'users.view', 'users.create', 'users.update', 'users.disable',
      'notifications.view', 'notifications.manage',
      'audit.view', 'reports.view',
      'telephony.view', 'telephony.manage', 'telephony.export',
      'flows.view', 'flows.manage',
      'alerts.view', 'alerts.manage',
    ],
  },
  {
    slug: 'user',
    name: 'User',
    description: 'Acesso operacional padrão',
    permissions: [
      'dashboard.view',
      'clients.view',
      'automations.view',
      'instances.view',
      'docs.view',
      'tickets.view', 'tickets.create', 'tickets.update',
      'incidents.view', 'incidents.create',
      'telephony.view',
      'flows.view',
      'alerts.view',
    ],
  },
];

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function assertCompanyEmail(email) {
  const normalized = normalizeEmail(email);
  const allowedDomain = env.google.allowedDomain || COMPANY_DOMAIN;
  const domain = normalized.split('@')[1];
  if (!normalized || domain !== allowedDomain) {
    throw new HttpError(403, `Acesso permitido somente para contas @${allowedDomain}.`);
  }
  return normalized;
}

export async function ensureBaseOrganization() {
  const orgName = env.organization.name || DEFAULT_ORG.name;
  const orgSlug = env.organization.slug || DEFAULT_ORG.slug;
  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP`,
    [createId(), orgName, orgSlug]
  );
  const { rows } = await query(`SELECT id, name, slug FROM organizations WHERE slug = ? LIMIT 1`, [orgSlug]);
  return rows[0];
}

async function getIdBySlug(table, organizationId, slug) {
  if (!slug) return null;
  const { rows } = await query(`SELECT id FROM ${table} WHERE organization_id = ? AND slug = ? LIMIT 1`, [organizationId, slug]);
  return rows[0]?.id || null;
}

export async function ensurePeopleDimensions(organizationId) {
  for (const team of TEAM_OPTIONS) {
    await query(
      `INSERT INTO teams (id, organization_id, name, slug)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP`,
      [createId(), organizationId, team.name, team.slug]
    );
  }

  for (const jobRole of JOB_ROLE_OPTIONS) {
    await query(
      `INSERT INTO job_roles (id, organization_id, name, slug)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP`,
      [createId(), organizationId, jobRole.name, jobRole.slug]
    );
  }

  for (const seniority of SENIORITY_OPTIONS) {
    await query(
      `INSERT INTO seniorities (id, organization_id, name, slug)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP`,
      [createId(), organizationId, seniority.name, seniority.slug]
    );
  }

  for (const area of AREA_OPTIONS) {
    await query(
      `INSERT INTO areas (id, organization_id, name, slug)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP`,
      [createId(), organizationId, area.name, area.slug]
    );
  }

  for (const bu of BUSINESS_UNIT_OPTIONS) {
    await query(
      `INSERT INTO business_units (id, organization_id, name, slug)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP`,
      [createId(), organizationId, bu.name, bu.slug]
    );
  }
}

export async function ensureAccessRoles(organizationId) {
  for (const role of ACCESS_ROLE_OPTIONS) {
    await query(
      `INSERT INTO roles (id, organization_id, name, slug, description)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
      [createId(), organizationId, role.name, role.slug, role.description]
    );

    const roleRow = await query(`SELECT id FROM roles WHERE organization_id = ? AND slug = ? LIMIT 1`, [organizationId, role.slug]);
    const roleId = roleRow.rows[0].id;

    for (const permissionSlug of role.permissions) {
      await query(
        `INSERT INTO permissions (id, slug, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [createId(), permissionSlug, permissionSlug]
      );
      const permission = await query(`SELECT id FROM permissions WHERE slug = ? LIMIT 1`, [permissionSlug]);
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [roleId, permission.rows[0].id]
      );
    }

    if (!role.permissions.includes('*')) {
      await query(
        `DELETE rp FROM role_permissions rp
          JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ?
           AND p.slug NOT IN (${role.permissions.map(() => '?').join(',')})`,
        [roleId, ...role.permissions]
      );
    }
  }
}

let cachedOrg = null;

export async function bootstrapAccessModel() {
  if (cachedOrg) return cachedOrg;

  const orgSlug = env.organization.slug || DEFAULT_ORG.slug;
  const { rows } = await query(`SELECT id, name, slug FROM organizations WHERE slug = ? LIMIT 1`, [orgSlug]);
  if (rows[0]) {
    const rolesCount = await query(`SELECT COUNT(*) as count FROM roles WHERE organization_id = ?`, [rows[0].id]);
    if (rolesCount.rows[0].count > 0) {
      cachedOrg = rows[0];
      return cachedOrg;
    }
  }

  const organization = await ensureBaseOrganization();
  await ensurePeopleDimensions(organization.id);
  await ensureAccessRoles(organization.id);
  cachedOrg = organization;
  return organization;
}

export async function getPermissions(userId) {
  const { rows } = await query(
    `SELECT DISTINCT p.slug
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = ?`,
    [userId]
  );
  return rows.map((row) => row.slug);
}

export async function assignAccessRole(userId, organizationId, roleSlug = 'user') {
  await ensureAccessRoles(organizationId);
  const { rows } = await query(
    `SELECT id FROM roles WHERE organization_id = ? AND slug = ? LIMIT 1`,
    [organizationId, roleSlug]
  );
  if (!rows[0]) throw new HttpError(400, 'Nível de acesso inválido.');
  await query(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
  await query(`INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, rows[0].id]);
}

export async function getUserAccessRole(userId) {
  const { rows } = await query(
    `SELECT r.slug, r.name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
      ORDER BY FIELD(r.slug, 'super-admin', 'admin', 'user'), r.name
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function upsertUserProfile(userId, organizationId, profile = {}) {
  await ensurePeopleDimensions(organizationId);
  const jobRoleId = await getIdBySlug('job_roles', organizationId, profile.jobRoleSlug || profile.job_role_slug || null);
  const teamId = await getIdBySlug('teams', organizationId, profile.teamSlug || profile.team_slug || null);
  const seniorityId = await getIdBySlug('seniorities', organizationId, profile.senioritySlug || profile.seniority_slug || null);
  const areaId = await getIdBySlug('areas', organizationId, profile.areaSlug || profile.area_slug || null);
  const businessUnitId = await getIdBySlug('business_units', organizationId, profile.businessUnitSlug || profile.business_unit_slug || null);

  await query(
    `INSERT INTO user_profiles (user_id, job_role_id, team_id, seniority_id, area_id, business_unit_id, google_sub, avatar_url, bio, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       job_role_id = COALESCE(VALUES(job_role_id), job_role_id),
       team_id = COALESCE(VALUES(team_id), team_id),
       seniority_id = COALESCE(VALUES(seniority_id), seniority_id),
       area_id = COALESCE(VALUES(area_id), area_id),
       business_unit_id = COALESCE(VALUES(business_unit_id), business_unit_id),
       google_sub = COALESCE(VALUES(google_sub), google_sub),
       avatar_url = COALESCE(VALUES(avatar_url), avatar_url),
       bio = COALESCE(VALUES(bio), bio),
       phone = COALESCE(VALUES(phone), phone),
       updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      jobRoleId,
      teamId,
      seniorityId,
      areaId,
      businessUnitId,
      profile.googleSub || profile.google_sub || null,
      profile.avatarUrl || profile.avatar_url || null,
      profile.bio || null,
      profile.phone || null,
    ]
  );
}

export async function getUserViewById(userId) {
  const { rows } = await query(
    `SELECT u.id,
            u.organization_id,
            u.name,
            u.email,
            u.status,
            u.last_login_at,
            u.created_at,
            u.updated_at,
            ar.slug AS access_role_slug,
            ar.name AS access_role_name,
            jr.slug AS job_role_slug,
            jr.name AS job_role_name,
            t.slug AS team_slug,
            t.name AS team_name,
            s.slug AS seniority_slug,
            s.name AS seniority_name,
            a.slug AS area_slug,
            a.name AS area_name,
            bu.slug AS business_unit_slug,
            bu.name AS business_unit_name,
            up.avatar_url,
            up.bio,
            up.phone
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       LEFT JOIN job_roles jr ON jr.id = up.job_role_id
       LEFT JOIN teams t ON t.id = up.team_id
       LEFT JOIN seniorities s ON s.id = up.seniority_id
       LEFT JOIN areas a ON a.id = up.area_id
       LEFT JOIN business_units bu ON bu.id = up.business_unit_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles ar ON ar.id = ur.role_id
      WHERE u.id = ?
      ORDER BY FIELD(ar.slug, 'super-admin', 'admin', 'user'), ar.name
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export function mapUserView(row, permissions = null) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    email: row.email,
    status: row.status,
    active: row.status === 'active',
    lastLogin: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    accessRoleSlug: row.access_role_slug || 'user',
    accessRoleName: row.access_role_name || 'User',
    role: (row.access_role_slug || 'user').toUpperCase(),
    jobRoleSlug: row.job_role_slug || '',
    jobRoleName: row.job_role_name || 'Sem cargo definido',
    teamSlug: row.team_slug || '',
    teamName: row.team_name || 'Sem time definido',
    senioritySlug: row.seniority_slug || '',
    seniorityName: row.seniority_name || 'Sem senioridade',
    areaSlug: row.area_slug || '',
    areaName: row.area_name || 'Sem área',
    businessUnitSlug: row.business_unit_slug || '',
    businessUnitName: row.business_unit_name || 'Sem BU',
    avatarUrl: row.avatar_url,
    bio: row.bio,
    phone: row.phone,
    ...(permissions ? { permissions } : {}),
  };
}

export async function updateOwnProfile(user, changes = {}) {
  const name = changes.name ? String(changes.name).trim() : user.name;
  await query(`UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [name, user.id]);
  await upsertUserProfile(user.id, user.organization_id, changes);
  const permissions = await getPermissions(user.id);
  const updated = await getUserViewById(user.id);
  return mapUserView(updated, permissions);
}

export async function createCompanyUser({ name, email, passwordHash, status = 'active', organizationId, accessRoleSlug = 'user', jobRoleSlug, teamSlug, senioritySlug, areaSlug, businessUnitSlug, googleSub, avatarUrl }) {
  const normalizedEmail = assertCompanyEmail(email);
  const id = createId();
  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO users (id, organization_id, name, email, password_hash, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, organizationId, String(name || normalizedEmail.split('@')[0]).trim(), normalizedEmail, passwordHash, status]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'Usuário já existe com esse e-mail.');
    }
    throw error;
  } finally {
    connection.release();
  }

  await assignAccessRole(id, organizationId, accessRoleSlug);
  await upsertUserProfile(id, organizationId, { jobRoleSlug, teamSlug, senioritySlug, areaSlug, businessUnitSlug, googleSub, avatarUrl });
  return getUserViewById(id);
}
