import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { createId } from '../../utils/id.js';

export const notificationRoutes = Router();
notificationRoutes.use(authenticate);

async function ensureAutomationErrorNotifications(organizationId) {
  const { rows } = await query(
    `SELECT oa.id AS alert_id,
            a.name AS automation_name,
            c.name AS client_name,
            oa.last_seen_at AS occurred_at,
            oa.occurrence_count
       FROM operational_alerts oa
       JOIN automations a ON a.id = oa.automation_id
       LEFT JOIN clients c ON c.id = oa.client_id
      WHERE oa.organization_id = ?
        AND oa.status = 'open'
        AND oa.occurrence_count >= 6
      LIMIT 100`,
    [organizationId]
  );

  for (const item of rows) {
    const exists = await query(
      `SELECT id FROM notifications WHERE organization_id = ? AND entity_type = 'alert' AND entity_id = ? LIMIT 1`,
      [organizationId, item.alert_id]
    );

    if (exists.rows.length === 0) {
      await query(
        `INSERT INTO notifications
          (id, organization_id, role_slug, title, description, type, priority, status, entity_type, entity_id, metadata)
         VALUES (?, ?, 'admin', ?, ?, 'automation_error', 'high', 'unread', 'alert', ?, CAST(? AS JSON))`,
        [
          createId(),
          organizationId,
          `Fluxo Urgente: ${item.automation_name}`,
          `Cliente ${item.client_name || 'sem cliente'} atingiu ${item.occurrence_count} erros acumulados.`,
          item.alert_id,
          JSON.stringify({ client_name: item.client_name, occurred_at: item.occurred_at, occurrence_count: item.occurrence_count }),
        ]
      );
    }
  }
}

function canAccessNotification(req, notification) {
  if (!notification) return false;
  if (notification.organization_id !== req.user.organization_id) return false;
  if (notification.user_id && notification.user_id !== req.user.id) return false;
  if (notification.role_slug && notification.role_slug !== req.user.access_role_slug && req.user.access_role_slug !== 'super-admin') return false;
  return true;
}

notificationRoutes.get('/', requirePermission('notifications.view'), asyncHandler(async (req, res) => {
  await ensureAutomationErrorNotifications(req.user.organization_id);

  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const { rows } = await query(
    `SELECT id, organization_id, user_id, role_slug, title, description, type, priority, status,
            entity_type, entity_id, metadata, read_at, created_at, updated_at
       FROM notifications
      WHERE organization_id = ?
        AND (user_id IS NULL OR user_id = ?)
        AND (role_slug IS NULL OR role_slug = ? OR ? = 'super-admin')
        AND status <> 'archived'
      ORDER BY CASE WHEN status = 'unread' THEN 0 ELSE 1 END, created_at DESC
      LIMIT ${limit}`,
    [req.user.organization_id, req.user.id, req.user.access_role_slug, req.user.access_role_slug]
  );

  ok(res, { data: rows });
}));

notificationRoutes.post('/', requirePermission('notifications.manage'), audit('notification', 'create'), asyncHandler(async (req, res) => {
  const {
    title,
    description,
    type = 'system',
    priority = 'medium',
    userId = null,
    roleSlug = null,
    entityType = null,
    entityId = null,
    metadata = null,
  } = req.body || {};

  if (!title || !description) throw new HttpError(400, 'title and description are required.');

  const id = createId();
  await query(
    `INSERT INTO notifications
      (id, organization_id, user_id, role_slug, title, description, type, priority, status, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, ?, CAST(? AS JSON))`,
    [
      id,
      req.user.organization_id,
      userId,
      roleSlug,
      title,
      description,
      type,
      priority,
      entityType,
      entityId,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  const { rows } = await query(`SELECT * FROM notifications WHERE id = ?`, [id]);
  created(res, rows[0]);
}));

notificationRoutes.patch('/:id/read', requirePermission('notifications.view'), audit('notification', 'mark_read'), asyncHandler(async (req, res) => {
  const current = await query(`SELECT * FROM notifications WHERE id = ? LIMIT 1`, [req.params.id]);
  if (!canAccessNotification(req, current.rows[0])) throw new HttpError(404, 'Notification not found.');
  res.locals.auditBefore = current.rows[0];

  await query(
    `UPDATE notifications
        SET status = 'read', read_at = COALESCE(read_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?`,
    [req.params.id, req.user.organization_id]
  );

  const { rows } = await query(`SELECT * FROM notifications WHERE id = ?`, [req.params.id]);
  ok(res, rows[0]);
}));

notificationRoutes.patch('/read-all', requirePermission('notifications.view'), audit('notification', 'mark_all_read'), asyncHandler(async (req, res) => {
  await query(
    `UPDATE notifications
        SET status = 'read', read_at = COALESCE(read_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = ?
        AND (user_id IS NULL OR user_id = ?)
        AND (role_slug IS NULL OR role_slug = ? OR ? = 'super-admin')
        AND status = 'unread'`,
    [req.user.organization_id, req.user.id, req.user.access_role_slug, req.user.access_role_slug]
  );
  ok(res, { ok: true });
}));
