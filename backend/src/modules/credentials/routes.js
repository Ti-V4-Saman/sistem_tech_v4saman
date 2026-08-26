import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { encryptSecret, decryptSecret } from '../../utils/crypto.js';
import { audit } from '../../middleware/audit.js';
import { createId } from '../../utils/id.js';

export const credentialRoutes = Router();
credentialRoutes.use(authenticate);

credentialRoutes.get('/', requirePermission('credentials.view_metadata'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT cr.id, cr.client_id, cr.client_tool_id, cr.type, cr.name, cr.url, cr.username, cr.email, cr.environment, cr.risk, cr.status, cr.expires_at, cr.last_rotated_at, cr.owner_user_id, cr.created_at, cr.updated_at,
            c.name AS client_name
       FROM credentials cr
       JOIN clients c ON c.id = cr.client_id
      WHERE c.organization_id = ?
      ORDER BY cr.updated_at DESC
      LIMIT 100`,
    [req.user.organization_id]
  );
  ok(res, { data: rows });
}));

credentialRoutes.post('/', requirePermission('credentials.create'), audit('credential', 'create', { severity: 'warning' }), asyncHandler(async (req, res) => {
  const { clientId, clientToolId, type, name, url, username, email, secret, environment = 'production', risk = 'high', expiresAt, ownerUserId, notes } = req.body || {};
  if (!clientId || !type || !name || !secret) throw new HttpError(400, 'clientId, type, name and secret are required.');

  const client = await query(`SELECT id FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`, [clientId, req.user.organization_id]);
  if (!client.rows[0]) throw new HttpError(404, 'Client not found.');

  const id = createId();
  await query(
    `INSERT INTO credentials (id, client_id, client_tool_id, type, name, url, username, email, encrypted_secret, environment, risk, expires_at, owner_user_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clientId, clientToolId || null, type, name, url || null, username || null, email || null, encryptSecret(secret), environment, risk, expiresAt || null, ownerUserId || null, notes || null]
  );

  const { rows } = await query(`SELECT id, client_id, type, name, environment, risk, status, created_at FROM credentials WHERE id = ?`, [id]);
  created(res, rows[0]);
}));

credentialRoutes.post('/:id/reveal', requirePermission('credentials.reveal_secret'), audit('credential', 'reveal_secret', { severity: 'critical' }), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT cr.id, cr.encrypted_secret
       FROM credentials cr
       JOIN clients c ON c.id = cr.client_id
      WHERE cr.id = ? AND c.organization_id = ?
      LIMIT 1`,
    [req.params.id, req.user.organization_id]
  );
  if (!rows[0]) throw new HttpError(404, 'Credential not found.');

  await query(
    `INSERT INTO credential_access_logs (id, credential_id, user_id, action, ip_address, user_agent)
     VALUES (?, ?, ?, 'reveal_secret', ?, ?)`,
    [createId(), req.params.id, req.user.id, req.ip, req.get('user-agent') || null]
  );

  ok(res, { id: req.params.id, secret: decryptSecret(rows[0].encrypted_secret) });
}));

credentialRoutes.get('/:id/audit', requirePermission('credentials.audit'), asyncHandler(async (req, res) => {
  const credential = await query(
    `SELECT cr.id
       FROM credentials cr
       JOIN clients c ON c.id = cr.client_id
      WHERE cr.id = ? AND c.organization_id = ?
      LIMIT 1`,
    [req.params.id, req.user.organization_id]
  );
  if (!credential.rows[0]) throw new HttpError(404, 'Credential not found.');

  const { rows } = await query(
    `SELECT cal.id, cal.action, cal.ip_address, cal.user_agent, cal.created_at, u.name AS user_name, u.email AS user_email
       FROM credential_access_logs cal
       LEFT JOIN users u ON u.id = cal.user_id
      WHERE cal.credential_id = ?
      ORDER BY cal.created_at DESC
      LIMIT 100`,
    [req.params.id]
  );
  ok(res, { data: rows });
}));
