import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { hashPassword } from '../../utils/crypto.js';
import { authenticate, requirePermission, requireAdmin } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import {
  ACCESS_ROLE_OPTIONS,
  JOB_ROLE_OPTIONS,
  TEAM_OPTIONS,
  assertCompanyEmail,
  assignAccessRole,
  bootstrapAccessModel,
  createCompanyUser,
  getPermissions,
  getUserViewById,
  mapUserView,
  updateOwnProfile,
  upsertUserProfile,
} from './profile.service.js';

export const userRoutes = Router();
userRoutes.use(authenticate);

async function listUsers(organizationId) {
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
            up.avatar_url,
            up.bio,
            up.phone
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       LEFT JOIN job_roles jr ON jr.id = up.job_role_id
       LEFT JOIN teams t ON t.id = up.team_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles ar ON ar.id = ur.role_id
      WHERE u.organization_id = ?
      ORDER BY u.name ASC
      LIMIT 200`,
    [organizationId]
  );

  return rows.map((row) => mapUserView(row));
}

userRoutes.get('/metadata', asyncHandler(async (req, res) => {
  const squads = await query(`SELECT slug, name FROM teams WHERE organization_id = ? ORDER BY name ASC`, [req.user.organization_id]);
  const jobRoles = await query(`SELECT slug, name FROM job_roles WHERE organization_id = ? ORDER BY name ASC`, [req.user.organization_id]);
  const seniorities = await query(`SELECT slug, name FROM seniorities WHERE organization_id = ? ORDER BY name ASC`, [req.user.organization_id]);
  const areas = await query(`SELECT slug, name FROM areas WHERE organization_id = ? ORDER BY name ASC`, [req.user.organization_id]);
  const bus = await query(`SELECT slug, name FROM business_units WHERE organization_id = ? ORDER BY name ASC`, [req.user.organization_id]);

  ok(res, {
    accessRoles: ACCESS_ROLE_OPTIONS.map(({ slug, name, description }) => ({ slug, name, description })),
    jobRoles: jobRoles.rows,
    teams: squads.rows,
    seniorities: seniorities.rows,
    areas: areas.rows,
    businessUnits: bus.rows,
  });
}));

userRoutes.get('/me/profile', asyncHandler(async (req, res) => {
  const permissions = await getPermissions(req.user.id);
  const view = await getUserViewById(req.user.id);
  ok(res, { user: mapUserView(view, permissions) });
}));

userRoutes.patch('/me/profile', audit('user', 'update_profile'), asyncHandler(async (req, res) => {
  const updated = await updateOwnProfile(req.user, req.body || {});
  ok(res, { user: updated });
}));

userRoutes.get('/', requireAdmin, requirePermission('users.view'), asyncHandler(async (req, res) => {
  ok(res, { data: await listUsers(req.user.organization_id) });
}));

userRoutes.post('/', requireAdmin, requirePermission('users.create'), audit('user', 'create'), asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    status = 'active',
    accessRoleSlug = 'user',
    roleSlug,
    role,
    jobRoleSlug,
    teamSlug,
    senioritySlug,
    areaSlug,
    businessUnitSlug,
  } = req.body || {};

  if (!name || !email) throw new HttpError(400, 'Name and email are required.');
  assertCompanyEmail(email);

  await bootstrapAccessModel();
  const passwordHash = password ? await hashPassword(password) : `google-only:${Date.now()}`;
  const roleToApply = roleSlug || accessRoleSlug || (String(role || '').toLowerCase() === 'admin' ? 'admin' : 'user');

  const row = await createCompanyUser({
    name,
    email,
    passwordHash,
    status,
    organizationId: req.user.organization_id,
    accessRoleSlug: roleToApply,
    jobRoleSlug,
    teamSlug,
    senioritySlug,
    areaSlug,
    businessUnitSlug,
  });

  created(res, mapUserView(row));
}));

userRoutes.patch('/:id', requireAdmin, requirePermission('users.update'), audit('user', 'update'), asyncHandler(async (req, res) => {
  const current = await query(`SELECT * FROM users WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  if (!current.rows[0]) throw new HttpError(404, 'User not found.');

  const previous = current.rows[0];
  res.locals.auditBefore = previous;
  const {
    name,
    email,
    status,
    active,
    accessRoleSlug,
    roleSlug,
    role,
    jobRoleSlug,
    teamSlug,
    senioritySlug,
    areaSlug,
    businessUnitSlug,
    bio,
    phone,
    password,
  } = req.body || {};

  const nextEmail = email ? assertCompanyEmail(email) : previous.email;
  const nextStatus = typeof active === 'boolean' ? (active ? 'active' : 'inactive') : (status ?? previous.status);

  if (password) {
    const passwordHash = await hashPassword(password);
    await query(
      `UPDATE users
          SET name = ?, email = ?, status = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND organization_id = ?`,
      [name ?? previous.name, nextEmail, nextStatus, passwordHash, req.params.id, req.user.organization_id]
    );
  } else {
    await query(
      `UPDATE users
          SET name = ?, email = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND organization_id = ?`,
      [name ?? previous.name, nextEmail, nextStatus, req.params.id, req.user.organization_id]
    );
  }

  const roleToApply = roleSlug || accessRoleSlug || (role ? String(role).toLowerCase() : null);
  if (roleToApply) await assignAccessRole(req.params.id, previous.organization_id, roleToApply);

  await upsertUserProfile(req.params.id, previous.organization_id, {
    jobRoleSlug,
    teamSlug,
    senioritySlug,
    areaSlug,
    businessUnitSlug,
    bio,
    phone,
  });

  const view = await getUserViewById(req.params.id);
  ok(res, mapUserView(view));
}));

userRoutes.delete('/:id', requireAdmin, requirePermission('users.disable'), audit('user', 'disable'), asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new HttpError(400, 'Você não pode desativar seu próprio usuário.');
  const { rows } = await query(`SELECT id FROM users WHERE id = ? AND organization_id = ? LIMIT 1`, [req.params.id, req.user.organization_id]);
  if (!rows[0]) throw new HttpError(404, 'User not found.');
  await query(`UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  ok(res, { ok: true });
}));

