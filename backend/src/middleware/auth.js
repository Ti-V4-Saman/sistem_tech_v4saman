import { HttpError } from '../utils/http.js';
import { verifyToken } from '../utils/crypto.js';
import { query } from '../db/pool.js';

export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const payload = verifyToken(token);
    if (!payload?.sub) throw new HttpError(401, 'Authentication required.');

    const { rows } = await query(
      `SELECT u.id, u.organization_id, u.name, u.email, u.status,
              ar.slug AS access_role_slug,
              jr.slug AS job_role_slug,
              jr.name AS job_role_name,
              t.slug AS team_slug,
              t.name AS team_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles ar ON ar.id = ur.role_id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN job_roles jr ON jr.id = up.job_role_id
         LEFT JOIN teams t ON t.id = up.team_id
        WHERE u.id = ? AND u.status = 'active'
        LIMIT 1`,
      [payload.sub]
    );

    if (!rows[0]) throw new HttpError(401, 'Invalid user session.');

    req.user = rows[0];
    req.permissions = payload.permissions || [];
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (req.permissions?.includes(permission) || req.permissions?.includes('*')) {
      return next();
    }
    return next(new HttpError(403, `Missing permission: ${permission}`));
  };
}

export function requireRole(...roles) {
  const allowed = new Set(roles.flat().filter(Boolean));
  return (req, res, next) => {
    const role = req.user?.access_role_slug;
    if (role === 'super-admin' || allowed.has(role)) return next();
    return next(new HttpError(403, 'Acesso restrito a administradores.'));
  };
}

export function requireAdmin(req, res, next) {
  const role = req.user?.access_role_slug;
  if (role === 'admin' || role === 'super-admin') return next();
  return next(new HttpError(403, 'Acesso restrito a administradores.'));
}
