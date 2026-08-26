import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError, ok } from '../../utils/http.js';
import { signToken } from '../../utils/crypto.js';
import { authenticate } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/security.js';
import { recordAudit } from '../../middleware/audit.js';
import { env } from '../../config/env.js';
import {
  assertCompanyEmail,
  assignAccessRole,
  bootstrapAccessModel,
  createCompanyUser,
  getPermissions,
  getUserViewById,
  mapUserView,
  normalizeEmail,
  upsertUserProfile,
} from '../users/profile.service.js';

export const authRoutes = Router();

const googleClient = env.google.clientId ? new OAuth2Client(env.google.clientId) : null;

async function buildSession(userId) {
  const permissions = await getPermissions(userId);
  const view = await getUserViewById(userId);
  if (!view || view.status !== 'active') throw new HttpError(401, 'Invalid user session.');

  return {
    accessToken: signToken({ sub: view.id, permissions }),
    user: mapUserView(view, permissions),
    permissions,
  };
}

async function verifyGoogleCredential(credential) {
  if (!env.google.clientId || !googleClient) {
    throw new HttpError(500, 'Google login is not configured. Set GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID.');
  }
  if (!credential) throw new HttpError(400, 'Google credential is required.');

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload?.sub) throw new HttpError(401, 'Invalid Google account.');
  if (!payload.email_verified) throw new HttpError(403, 'Google email is not verified.');

  const email = assertCompanyEmail(payload.email);
  const allowedDomain = env.google.allowedDomain;
  if (payload.hd !== allowedDomain) {
    throw new HttpError(403, `Acesso permitido somente para contas Google Workspace @${allowedDomain}.`);
  }

  return {
    sub: payload.sub,
    email,
    name: payload.name || email.split('@')[0],
    avatarUrl: payload.picture || null,
  };
}

async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  const { rows } = await query(
    `SELECT id, organization_id, name, email, password_hash, status
       FROM users
      WHERE email = ?
      LIMIT 1`,
    [normalized]
  );
  return rows[0] || null;
}

async function ensureAdminPrivileges(userId, organizationId, email) {
  const emailLower = email.toLowerCase();
  const isSuperAdmin = ['gabriel.guerra@v4company.com', 'giovani.maia@v4company.com', 'ti.bh@v4company.com'].includes(emailLower);
  if (isSuperAdmin) {
    await assignAccessRole(userId, organizationId, 'super-admin');
    await upsertUserProfile(userId, organizationId, {
      teamSlug: 'briu',
    });
  }
}

function writeAuthAudit(req, user, action, summary) {
  recordAudit({
    organizationId: user.organization_id,
    userId: user.id,
    entityType: 'auth',
    entityId: user.id,
    action,
    summary,
    severity: action === 'logout' ? 'info' : 'notice',
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  }).catch((error) => console.error('[audit] auth:', error.message));
}

authRoutes.post('/login', rateLimit({ windowMs: 60_000, limit: 10 }), asyncHandler(async (_req, _res) => {
  throw new HttpError(410, 'Login por senha foi desativado. Use o login com Google @v4company.com.');
}));

authRoutes.post('/google', rateLimit({ windowMs: 60_000, limit: 20 }), asyncHandler(async (req, res) => {
  const profile = await verifyGoogleCredential(req.body?.credential);
  const organization = await bootstrapAccessModel();
  let user = await findUserByEmail(profile.email);

  if (!user) {
    const emailLower = profile.email.toLowerCase();
    const isSuperAdmin = ['gabriel.guerra@v4company.com', 'giovani.maia@v4company.com', 'ti.bh@v4company.com'].includes(emailLower);

    const created = await createCompanyUser({
      name: profile.name,
      email: profile.email,
      passwordHash: `google:${profile.sub}`,
      organizationId: organization.id,
      accessRoleSlug: isSuperAdmin ? 'super-admin' : 'user',
      teamSlug: isSuperAdmin ? 'briu' : null,
      googleSub: profile.sub,
      avatarUrl: profile.avatarUrl,
    });
    user = { id: created.id, organization_id: created.organizationId, status: created.status };
  } else if (user.status !== 'active') {
    throw new HttpError(403, 'Seu usuário está inativo ou bloqueado.');
  } else {
    const emailLower = profile.email.toLowerCase();
    const isSuperAdmin = ['gabriel.guerra@v4company.com', 'giovani.maia@v4company.com', 'ti.bh@v4company.com'].includes(emailLower);
    if (isSuperAdmin) {
      await assignAccessRole(user.id, user.organization_id, 'super-admin');
      await upsertUserProfile(user.id, user.organization_id, {
        googleSub: profile.sub,
        avatarUrl: profile.avatarUrl,
        teamSlug: 'briu',
      });
    } else {
      await upsertUserProfile(user.id, user.organization_id, {
        googleSub: profile.sub,
        avatarUrl: profile.avatarUrl,
      });
    }
  }

  await query(`UPDATE users SET name = COALESCE(NULLIF(name, ''), ?), last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [profile.name, user.id]);
  writeAuthAudit(req, user, 'login_google', 'Login Google realizado com sucesso');
  ok(res, await buildSession(user.id));
}));

authRoutes.get('/me', authenticate, asyncHandler(async (req, res) => {
  ok(res, await buildSession(req.user.id));
}));

authRoutes.post('/logout', authenticate, asyncHandler(async (req, res) => {
  writeAuthAudit(req, req.user, 'logout', 'Logout realizado');
  ok(res, { ok: true });
}));
