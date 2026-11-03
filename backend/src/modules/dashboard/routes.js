import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate);

async function measuredQuery(label, sql, params) {
  const startedAt = Date.now();
  try {
    return await query(sql, params);
  } finally {
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= 1000) console.warn(`[performance] dashboard.${label} ${elapsedMs}ms`);
  }
}

async function overviewHandler(req, res) {
  const orgId = req.user.organization_id;
  const baseMetricsPromise = measuredQuery('base-metrics', `
    SELECT
      (SELECT COUNT(*) FROM clients WHERE organization_id = ? AND status = 'active') AS active_clients,
      (SELECT COUNT(*) FROM clients WHERE organization_id = ? AND status = 'onboarding') AS onboarding_clients,
      (SELECT COUNT(DISTINCT client_id) FROM operational_alerts WHERE organization_id = ? AND status = 'open' AND last_seen_at >= DATE_SUB(NOW(), INTERVAL 5 DAY)) AS clients_at_risk,
      (SELECT COUNT(*) FROM automations a JOIN clients c ON c.id = a.client_id WHERE c.organization_id = ? AND a.is_active = 1) AS active_automations,
      (SELECT COUNT(*) FROM automations a JOIN clients c ON c.id = a.client_id WHERE c.organization_id = ?) AS total_automations,
      (SELECT COUNT(*) FROM operational_alerts WHERE organization_id = ? AND status = 'open' AND last_seen_at >= DATE_SUB(NOW(), INTERVAL 5 DAY)) AS automations_with_error,
      (SELECT COUNT(*) FROM bots b JOIN clients c ON c.id = b.client_id WHERE c.organization_id = ? AND b.is_published = 1) AS published_bots,
      (SELECT COUNT(*) FROM bots b JOIN clients c ON c.id = b.client_id WHERE c.organization_id = ?) AS total_bots,
      (SELECT COUNT(*) FROM whatsapp_instances wi JOIN clients c ON c.id = wi.client_id WHERE c.organization_id = ? AND wi.status = 'active') AS active_whatsapp_instances,
      (SELECT COUNT(*) FROM whatsapp_instances wi JOIN clients c ON c.id = wi.client_id WHERE c.organization_id = ?) AS total_whatsapp_instances,
      (SELECT COUNT(*) FROM tickets WHERE organization_id = ? AND status NOT IN ('done', 'cancelled')) AS open_tickets,
      (SELECT COUNT(*) FROM incidents WHERE organization_id = ? AND status NOT IN ('resolved', 'closed')) AS open_incidents,
      (SELECT COUNT(*) FROM credentials cr JOIN clients c ON c.id = cr.client_id WHERE c.organization_id = ? AND cr.expires_at IS NOT NULL AND cr.expires_at < CURRENT_TIMESTAMP) AS expired_credentials,
      (SELECT COALESCE(SUM(fee_amount), 0) FROM clients WHERE organization_id = ? AND status = 'active') AS total_mrr
  `, Array(14).fill(orgId));

  const runMetricsPromise = measuredQuery('run-metrics', `
    SELECT COUNT(*) AS total_runs,
           COALESCE(SUM(CASE WHEN ar.status IN ('success', 'succeeded', 'ok', 'finished') THEN 1 ELSE 0 END), 0) AS successful_runs,
           COALESCE(SUM(CASE WHEN ar.status IN ('error', 'failed', 'failure', 'crashed') THEN 1 ELSE 0 END), 0) AS failed_runs,
           COALESCE(SUM(CASE WHEN ar.status IN ('running', 'pending', 'waiting') THEN 1 ELSE 0 END), 0) AS pending_runs
      FROM automation_runs ar FORCE INDEX (idx_runs_started_automation_status)
      JOIN automations a ON a.id = ar.automation_id
      JOIN clients c ON c.id = a.client_id
     WHERE ar.started_at >= DATE_SUB(NOW(), INTERVAL 5 DAY)
       AND c.organization_id = ?
  `, [orgId]);

  const metricsPromise = Promise.all([baseMetricsPromise, runMetricsPromise]).then(([base, runs]) => {
    const metrics = { ...(base.rows[0] || {}), ...(runs.rows[0] || {}) };
    const completedRuns = Number(metrics.successful_runs || 0) + Number(metrics.failed_runs || 0);
    metrics.success_rate = completedRuns ? Math.round((Number(metrics.successful_runs || 0) / completedRuns) * 10_000) / 100 : 0;
    metrics.failure_rate = completedRuns ? Math.round((Number(metrics.failed_runs || 0) / completedRuns) * 10_000) / 100 : 0;
    return { rows: [metrics] };
  });

  const topClientsPromise = measuredQuery('top-clients', `
    SELECT c.name,
           COALESCE(a.automations, 0) AS automations,
           COALESCE(b.bots, 0) AS bots,
           COALESCE(wi.whatsapp_instances, 0) AS whatsapp_instances
      FROM clients c
      LEFT JOIN (
        SELECT a.client_id, COUNT(*) AS automations
          FROM clients ac
          STRAIGHT_JOIN automations a ON a.client_id = ac.id
         WHERE ac.organization_id = ?
         GROUP BY a.client_id
      ) a ON a.client_id = c.id
      LEFT JOIN (
        SELECT b.client_id, COUNT(*) AS bots
          FROM clients bc
          STRAIGHT_JOIN bots b ON b.client_id = bc.id
         WHERE bc.organization_id = ?
         GROUP BY b.client_id
      ) b ON b.client_id = c.id
      LEFT JOIN (
        SELECT wi.client_id, COUNT(*) AS whatsapp_instances
          FROM clients wc
          STRAIGHT_JOIN whatsapp_instances wi ON wi.client_id = wc.id
         WHERE wc.organization_id = ?
         GROUP BY wi.client_id
      ) wi ON wi.client_id = c.id
     WHERE c.organization_id = ?
     ORDER BY (COALESCE(a.automations, 0) + COALESCE(b.bots, 0) + COALESCE(wi.whatsapp_instances, 0)) DESC
     LIMIT 10
  `, [orgId, orgId, orgId, orgId]);

  const ticketPriorityPromise = measuredQuery('ticket-priority', `
    SELECT priority, COUNT(*) AS count
      FROM tickets
     WHERE organization_id = ? AND status NOT IN ('done', 'cancelled')
     GROUP BY priority
  `, [orgId]);

  const incidentSeverityPromise = measuredQuery('incident-severity', `
    SELECT severity, COUNT(*) AS count
      FROM incidents
     WHERE organization_id = ? AND status NOT IN ('resolved', 'closed')
     GROUP BY severity
  `, [orgId]);

  // O banco de produção é remoto; executar os blocos independentes em paralelo
  // elimina três viagens de rede sequenciais no carregamento do dashboard.
  const [{ rows }, topClients, ticketPriority, incidentSeverity] = await Promise.all([
    metricsPromise,
    topClientsPromise,
    ticketPriorityPromise,
    incidentSeverityPromise,
  ]);

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
