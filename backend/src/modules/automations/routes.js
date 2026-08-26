import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { syncN8nData, syncTypebotData, syncExternalData } from '../integrations/sync.service.js';

export const automationRoutes = Router();
automationRoutes.use(authenticate);

async function attachRuns(automations) {
  if (!automations.length) return automations;

  const ids = automations.map((item) => item.id);
  const placeholders = ids.map(() => '?').join(', ');
  const runs = await query(
    `WITH ranked_runs AS (
       SELECT automation_id,
              external_run_id AS id,
              status,
              started_at,
              finished_at,
              duration_ms,
              error_message,
              metadata,
              ROW_NUMBER() OVER (PARTITION BY automation_id ORDER BY started_at DESC, created_at DESC) AS rn
         FROM automation_runs
        WHERE automation_id IN (${placeholders})
     )
     SELECT automation_id, id, status, started_at, finished_at, duration_ms, error_message, metadata
       FROM ranked_runs
      WHERE rn <= 30
      ORDER BY started_at DESC`,
    ids
  );

  const runsByAutomation = new Map();
  for (const run of runs.rows) {
    if (!runsByAutomation.has(run.automation_id)) runsByAutomation.set(run.automation_id, []);
    runsByAutomation.get(run.automation_id).push({
      id: run.id,
      status: run.status,
      started_at: run.started_at,
      stopped_at: run.finished_at,
      duration_ms: run.duration_ms,
      error_message: run.error_message,
      metadata: run.metadata,
    });
  }

  return automations.map((automation) => ({
    ...automation,
    executions: runsByAutomation.get(automation.id) || [],
  }));
}

automationRoutes.get('/', requirePermission('automations.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT a.*, c.name AS client_name
       FROM automations a
       LEFT JOIN clients c ON c.id = a.client_id
      WHERE c.organization_id = ? OR a.client_id IS NULL
      ORDER BY a.updated_at DESC
      LIMIT 300`,
    [req.user.organization_id]
  );

  ok(res, { data: await attachRuns(rows) });
}));

automationRoutes.post('/sync/n8n', requirePermission('automations.sync'), asyncHandler(async (req, res) => {
  ok(res, await syncN8nData());
}));

automationRoutes.post('/sync/typebot', requirePermission('automations.sync'), asyncHandler(async (req, res) => {
  ok(res, await syncTypebotData());
}));

automationRoutes.post('/sync', requirePermission('automations.sync'), asyncHandler(async (req, res) => {
  ok(res, await syncExternalData());
}));

automationRoutes.patch('/bots/:id/status', requirePermission('automations.update_status'), asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  const isPublished = status === 'active' || status === 'published' ? 1 : 0;
  const dbStatus = status === 'active' || status === 'published' ? 'active' : 'inactive';

  await query(
    `UPDATE bots SET status = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [dbStatus, isPublished, req.params.id]
  );

  const { rows } = await query(`SELECT * FROM bots WHERE id = ?`, [req.params.id]);
  ok(res, rows[0]);
}));

automationRoutes.patch('/:id/status', requirePermission('automations.update_status'), asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  const isActive = status === 'active' || status === 'published' ? 1 : 0;
  const dbStatus = status === 'active' || status === 'published' ? 'active' : 'inactive';

  await query(
    `UPDATE automations SET status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [dbStatus, isActive, req.params.id]
  );

  const { rows } = await query(`SELECT * FROM automations WHERE id = ?`, [req.params.id]);
  ok(res, rows[0]);
}));
