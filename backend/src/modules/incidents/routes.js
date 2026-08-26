import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { createId } from '../../utils/id.js';

export const incidentRoutes = Router();
incidentRoutes.use(authenticate);

incidentRoutes.get('/', requirePermission('incidents.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT i.*, c.name AS client_name, assignee.name AS assignee_name
       FROM incidents i
       LEFT JOIN clients c ON c.id = i.client_id
       LEFT JOIN users assignee ON assignee.id = i.assignee_user_id
      WHERE i.organization_id = ?
      ORDER BY i.created_at DESC
      LIMIT 100`,
    [req.user.organization_id]
  );
  ok(res, { data: rows });
}));

incidentRoutes.post('/', requirePermission('incidents.create'), audit('incident', 'create', { severity: 'warning' }), asyncHandler(async (req, res) => {
  const { clientId, title, description, severity = 'medium', affectedToolId, assigneeUserId, impact } = req.body || {};
  if (!title) throw new HttpError(400, 'Title is required.');

  if (clientId) {
    const client = await query(`SELECT id FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`, [clientId, req.user.organization_id]);
    if (!client.rows[0]) throw new HttpError(404, 'Client not found.');
  }

  const id = createId();
  await query(
    `INSERT INTO incidents (id, organization_id, client_id, title, description, severity, affected_tool_id, assignee_user_id, impact)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user.organization_id, clientId || null, title, description || null, severity, affectedToolId || null, assigneeUserId || null, impact || null]
  );

  const { rows } = await query(`SELECT * FROM incidents WHERE id = ? AND organization_id = ?`, [id, req.user.organization_id]);
  created(res, rows[0]);
}));
