import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { createId } from '../../utils/id.js';

export const ticketRoutes = Router();
ticketRoutes.use(authenticate);

ticketRoutes.get('/', requirePermission('tickets.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT t.*, c.name AS client_name, requester.name AS requester_name, assignee.name AS assignee_name
       FROM tickets t
       LEFT JOIN clients c ON c.id = t.client_id
       LEFT JOIN users requester ON requester.id = t.requester_user_id
       LEFT JOIN users assignee ON assignee.id = t.assignee_user_id
      WHERE t.organization_id = ?
      ORDER BY t.created_at DESC
      LIMIT 100`,
    [req.user.organization_id]
  );
  ok(res, { data: rows });
}));

ticketRoutes.post('/', requirePermission('tickets.create'), audit('ticket', 'create'), asyncHandler(async (req, res) => {
  const { clientId, title, description, type, priority = 'medium', assigneeUserId, dueAt } = req.body || {};
  if (!clientId || !title || !description || !type) {
    throw new HttpError(400, 'clientId, title, description and type are required.');
  }

  const client = await query(`SELECT id FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`, [clientId, req.user.organization_id]);
  if (!client.rows[0]) throw new HttpError(404, 'Client not found.');

  const id = createId();
  await query(
    `INSERT INTO tickets (id, organization_id, client_id, title, description, type, priority, requester_user_id, assignee_user_id, due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user.organization_id, clientId, title, description, type, priority, req.user.id, assigneeUserId || null, dueAt || null]
  );

  const { rows } = await query(`SELECT * FROM tickets WHERE id = ? AND organization_id = ?`, [id, req.user.organization_id]);
  created(res, rows[0]);
}));
