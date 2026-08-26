import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate);

async function overviewHandler(req, res) {
  const orgId = req.user.organization_id;
  const { rows } = await query(`
    WITH org_clients AS (
      SELECT id, name, status, fee_amount
        FROM clients
       WHERE organization_id = ?
    ), org_automations AS (
      SELECT a.*
        FROM automations a
        JOIN org_clients c ON c.id = a.client_id
    ), org_bots AS (
      SELECT b.*
        FROM bots b
        JOIN org_clients c ON c.id = b.client_id
    ), org_runs AS (
      SELECT ar.*
        FROM automation_runs ar
        JOIN org_automations a ON a.id = ar.automation_id
       WHERE ar.started_at >= DATE_SUB(NOW(), INTERVAL 5 DAY)
    ), run_stats AS (
      SELECT COUNT(*) AS total_runs,
             SUM(CASE WHEN status IN ('success', 'succeeded', 'ok', 'finished') THEN 1 ELSE 0 END) AS successful_runs,
             SUM(CASE WHEN status IN ('error', 'failed', 'failure', 'crashed') THEN 1 ELSE 0 END) AS failed_runs,
             SUM(CASE WHEN status IN ('running', 'pending', 'waiting') THEN 1 ELSE 0 END) AS pending_runs
        FROM org_runs
    )
    SELECT
      (SELECT COUNT(*) FROM org_clients WHERE status = 'active') AS active_clients,
      (SELECT COUNT(*) FROM org_clients WHERE status = 'onboarding') AS onboarding_clients,
      (SELECT COUNT(DISTINCT client_id) FROM operational_alerts WHERE organization_id = ? AND status = 'open' AND last_seen_at >= DATE_SUB(NOW(), INTERVAL 5 DAY)) AS clients_at_risk,
      (SELECT COUNT(*) FROM org_automations WHERE is_active = 1) AS active_automations,
      (SELECT COUNT(*) FROM org_automations) AS total_automations,
      (SELECT COUNT(*) FROM operational_alerts WHERE organization_id = ? AND status = 'open' AND last_seen_at >= DATE_SUB(NOW(), INTERVAL 5 DAY)) AS automations_with_error,
      (SELECT COUNT(*) FROM org_bots WHERE is_published = 1) AS published_bots,
      (SELECT COUNT(*) FROM org_bots) AS total_bots,
      (SELECT COUNT(*) FROM whatsapp_instances wi JOIN org_clients c ON c.id = wi.client_id WHERE wi.status = 'active') AS active_whatsapp_instances,
      (SELECT COUNT(*) FROM whatsapp_instances wi JOIN org_clients c ON c.id = wi.client_id) AS total_whatsapp_instances,
      (SELECT COUNT(*) FROM tickets WHERE organization_id = ? AND status NOT IN ('done', 'cancelled')) AS open_tickets,
      (SELECT COUNT(*) FROM incidents WHERE organization_id = ? AND status NOT IN ('resolved', 'closed')) AS open_incidents,
      (SELECT COUNT(*) FROM credentials cr JOIN org_clients c ON c.id = cr.client_id WHERE cr.expires_at IS NOT NULL AND cr.expires_at < CURRENT_TIMESTAMP) AS expired_credentials,
      (SELECT COALESCE(SUM(fee_amount), 0) FROM org_clients WHERE status = 'active') AS total_mrr,
      COALESCE((SELECT total_runs FROM run_stats), 0) AS total_runs,
      COALESCE((SELECT successful_runs FROM run_stats), 0) AS successful_runs,
      COALESCE((SELECT failed_runs FROM run_stats), 0) AS failed_runs,
      COALESCE((SELECT pending_runs FROM run_stats), 0) AS pending_runs,
      CASE WHEN COALESCE((SELECT total_runs FROM run_stats), 0) = 0 THEN 0 ELSE ROUND(((SELECT successful_runs FROM run_stats) / (SELECT total_runs FROM run_stats)) * 100, 2) END AS success_rate,
      CASE WHEN COALESCE((SELECT total_runs FROM run_stats), 0) = 0 THEN 0 ELSE ROUND(((SELECT failed_runs FROM run_stats) / (SELECT total_runs FROM run_stats)) * 100, 2) END AS failure_rate
  `, [orgId, orgId, orgId, orgId, orgId]);

  const topClients = await query(`
    SELECT c.name,
           COUNT(DISTINCT a.id) AS automations,
           COUNT(DISTINCT b.id) AS bots,
           COUNT(DISTINCT wi.id) AS whatsapp_instances
      FROM clients c
      LEFT JOIN automations a ON a.client_id = c.id
      LEFT JOIN bots b ON b.client_id = c.id
      LEFT JOIN whatsapp_instances wi ON wi.client_id = c.id
     WHERE c.organization_id = ?
     GROUP BY c.id, c.name
     ORDER BY (COUNT(DISTINCT a.id) + COUNT(DISTINCT b.id) + COUNT(DISTINCT wi.id)) DESC
     LIMIT 10
  `, [orgId]);

  const ticketPriority = await query(`
    SELECT priority, COUNT(*) AS count
      FROM tickets
     WHERE organization_id = ? AND status NOT IN ('done', 'cancelled')
     GROUP BY priority
  `, [orgId]);

  const incidentSeverity = await query(`
    SELECT severity, COUNT(*) AS count
      FROM incidents
     WHERE organization_id = ? AND status NOT IN ('resolved', 'closed')
     GROUP BY severity
  `, [orgId]);

  ok(res, {
    metrics: rows[0],
    topClients: topClients.rows,
    ticketPriority: ticketPriority.rows,
    incidentSeverity: incidentSeverity.rows
  });
}

dashboardRoutes.get('/', requirePermission('dashboard.view'), asyncHandler(overviewHandler));
dashboardRoutes.get('/overview', requirePermission('dashboard.view'), asyncHandler(overviewHandler));

// Endpoint /health removed as requested

dashboardRoutes.get('/alerts', requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT 'automation_error' AS type, c.name AS client, a.name AS title, oa.last_seen_at AS occurred_at, 
           CASE 
             WHEN oa.occurrence_count >= 20 THEN 'urgent'
             WHEN oa.occurrence_count >= 10 THEN 'high'
             WHEN oa.occurrence_count >= 4 THEN 'medium'
             ELSE 'low'
           END AS urgency, 
           oa.occurrence_count
      FROM operational_alerts oa
      JOIN automations a ON a.id = oa.automation_id
      JOIN clients c ON c.id = oa.client_id
     WHERE oa.organization_id = ? AND oa.status = 'open' AND oa.last_seen_at >= DATE_SUB(NOW(), INTERVAL 5 DAY)
    UNION ALL
    SELECT 'credential_expired' AS type, c.name AS client, cr.name AS title, cr.expires_at AS occurred_at, 'high' AS urgency, 1 AS occurrence_count
      FROM credentials cr
      JOIN clients c ON c.id = cr.client_id
     WHERE c.organization_id = ? AND cr.expires_at IS NOT NULL AND cr.expires_at < CURRENT_TIMESTAMP
    ORDER BY occurred_at IS NULL, occurred_at DESC
    LIMIT 50
  `, [req.user.organization_id, req.user.organization_id]);
  ok(res, { data: rows });
}));
