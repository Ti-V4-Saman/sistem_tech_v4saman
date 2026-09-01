import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';

export const alertRoutes = Router();
alertRoutes.use(authenticate);

// Get list of open alerts and summary
alertRoutes.get('/', requirePermission('alerts.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT 
      oa.id,
      'automation_error' AS type,
      c.name AS client,
      a.name AS title,
      oa.last_seen_at AS occurred_at,
      CONCAT(oa.occurrence_count, ' erro(s) registrado(s). Última falha: ', COALESCE(oa.last_error_message, 'Sem detalhes adicionais.')) AS message,
      oa.occurrence_count,
      a.url AS automation_url,
      CASE 
        WHEN oa.occurrence_count = 1 THEN 'low'
        WHEN oa.occurrence_count BETWEEN 2 AND 3 THEN 'medium'
        WHEN oa.occurrence_count BETWEEN 4 AND 5 THEN 'high'
        ELSE 'urgent'
      END AS urgency
     FROM operational_alerts oa
     JOIN automations a ON a.id = oa.automation_id
     LEFT JOIN clients c ON c.id = oa.client_id
     WHERE oa.organization_id = ? AND oa.status = 'open' AND oa.last_seen_at >= DATE_SUB(NOW(), INTERVAL 5 DAY)
     ORDER BY oa.last_seen_at DESC`,
    [req.user.organization_id]
  );
  
  const { rows: totals } = await query(
    `SELECT COUNT(*) as open_alerts, SUM(occurrence_count) as total_occurrences 
     FROM operational_alerts 
     WHERE organization_id = ? AND status = 'open'`,
    [req.user.organization_id]
  );
  
  ok(res, { 
    data: rows, 
    open_alerts: Number(totals[0]?.open_alerts || 0), 
    total_occurrences: Number(totals[0]?.total_occurrences || 0) 
  });
}));

// Get specific error events for an alert
alertRoutes.get('/:id/events', requirePermission('alerts.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT 
      e.id,
      e.alert_id,
      e.automation_run_id,
      e.external_run_id,
      e.error_message,
      e.occurred_at,
      a.url AS automation_url
     FROM operational_alert_events e
     JOIN operational_alerts oa ON oa.id = e.alert_id
     JOIN automations a ON a.id = oa.automation_id
     WHERE e.alert_id = ? AND e.organization_id = ?
     ORDER BY e.occurred_at DESC
     LIMIT 50`,
    [req.params.id, req.user.organization_id]
  );

  ok(res, { data: rows });
}));

// Resolve an alert
alertRoutes.post('/:id/resolve', requirePermission('alerts.manage'), audit('alert', 'resolve'), asyncHandler(async (req, res) => {
  const { resolution_note } = req.body || {};
  
  const current = await query(`SELECT * FROM operational_alerts WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  if (!current.rows[0]) throw new HttpError(404, 'Alert not found.');
  if (current.rows[0].status === 'resolved') throw new HttpError(400, 'Este alerta já está resolvido.');

  res.locals.auditBefore = current.rows[0];

  await query(
    `UPDATE operational_alerts 
     SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by_user_id = ?, resolution_note = ?
     WHERE id = ?`,
    [req.user.id, resolution_note || null, req.params.id]
  );

  await query(
    `UPDATE notifications 
     SET status = 'read', read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
     WHERE entity_type = 'alert' AND entity_id = ? AND organization_id = ?`,
    [req.params.id, req.user.organization_id]
  );
  
  ok(res, { success: true });
}));

// Manage preferences
alertRoutes.get('/preferences/:type/:id', requirePermission('alerts.view'), asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const { rows } = await query(
    `SELECT enabled FROM notification_preferences WHERE organization_id = ? AND entity_type = ? AND entity_id = ?`,
    [req.user.organization_id, type, id]
  );
  ok(res, { enabled: rows.length > 0 ? Boolean(rows[0].enabled) : true });
}));

alertRoutes.post('/preferences/:type/:id', requirePermission('alerts.manage'), audit('alert_preference', 'update'), asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') throw new HttpError(400, 'enabled must be boolean');

  await query(
    `INSERT INTO notification_preferences (id, organization_id, entity_type, entity_id, enabled, updated_by_user_id)
     VALUES (UUID(), ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_by_user_id = VALUES(updated_by_user_id)`,
    [req.user.organization_id, type, id, enabled, req.user.id]
  );
  
  ok(res, { success: true, enabled });
}));

// Get history
alertRoutes.get('/history', requirePermission('alerts.view'), asyncHandler(async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 50, 100);
  const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);

  const { rows } = await query(
    `SELECT 
      oa.id,
      'automation_error' AS type,
      c.name AS client,
      a.name AS title,
      oa.last_seen_at AS occurred_at,
      oa.resolved_at,
      u.name AS resolved_by_name,
      oa.resolution_note,
      a.url AS automation_url,
      CASE 
        WHEN oa.occurrence_count = 1 THEN 'low'
        WHEN oa.occurrence_count BETWEEN 2 AND 3 THEN 'medium'
        WHEN oa.occurrence_count BETWEEN 4 AND 5 THEN 'high'
        ELSE 'urgent'
      END AS urgency
     FROM operational_alerts oa
     JOIN automations a ON a.id = oa.automation_id
     LEFT JOIN clients c ON c.id = oa.client_id
     LEFT JOIN users u ON u.id = oa.resolved_by_user_id
     WHERE oa.organization_id = ? AND oa.status = 'resolved'
     ORDER BY oa.resolved_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    [req.user.organization_id]
  );
  
  ok(res, { data: rows });
}));
