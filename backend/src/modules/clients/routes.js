import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { createId } from '../../utils/id.js';

export const clientRoutes = Router();
clientRoutes.use(authenticate);


async function attachAutomationRuns(automations) {
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


clientRoutes.get('/', requirePermission('clients.view'), asyncHandler(async (req, res) => {
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 50, 100);
  const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);

  const params = [req.user.organization_id];
  let where = 'WHERE c.organization_id = ?';
  if (search) {
    where += ' AND (c.name LIKE ? OR c.legal_name LIKE ? OR c.cnpj LIKE ?)';
    params.push(search, search, search);
  }

  const { rows } = await query(
    `SELECT c.id,
            c.name,
            c.legal_name,
            c.cnpj,
            CASE 
              WHEN c.status = 'active' AND 
                   (COUNT(DISTINCT CASE WHEN a.status = 'active' OR a.is_active = 1 THEN a.id END) = 0) AND 
                   (COUNT(DISTINCT CASE WHEN b.status = 'active' OR b.is_published = 1 THEN b.id END) = 0) 
              THEN 'inactive'
              ELSE c.status 
            END AS status,
            c.fee_amount,
            c.unit,
            c.health_score,
            c.started_at,
            c.last_review_at,
            c.created_at,
            c.updated_at,
            COUNT(DISTINCT a.id) AS total_automations,
            COUNT(DISTINCT CASE WHEN a.status = 'active' OR a.is_active = 1 THEN a.id END) AS active_automations,
            COUNT(DISTINCT b.id) AS total_bots,
            COUNT(DISTINCT CASE WHEN b.status = 'active' OR b.is_published = 1 THEN b.id END) AS published_bots,
            COALESCE(rs.total_runs, 0) AS total_runs,
            COALESCE(rs.success_runs, 0) AS success_runs,
            COALESCE(rs.error_runs, 0) AS error_runs,
            CASE WHEN COALESCE(rs.success_runs + rs.error_runs, 0) = 0 THEN NULL ELSE ROUND((rs.success_runs / (rs.success_runs + rs.error_runs)) * 100, 2) END AS success_rate,
            CASE WHEN COALESCE(rs.success_runs + rs.error_runs, 0) = 0 THEN NULL ELSE ROUND((rs.error_runs / (rs.success_runs + rs.error_runs)) * 100, 2) END AS failure_rate,
            c.notes
       FROM clients c
       LEFT JOIN automations a ON a.client_id = c.id
       LEFT JOIN bots b ON b.client_id = c.id
       LEFT JOIN (
          SELECT a.client_id,
                 COUNT(*) AS total_runs,
                 SUM(CASE WHEN ar.status IN ('success', 'succeeded', 'ok', 'finished') THEN 1 ELSE 0 END) AS success_runs,
                 SUM(CASE WHEN ar.status IN ('error', 'failed', 'failure', 'crashed') THEN 1 ELSE 0 END) AS error_runs
            FROM automations a
            JOIN automation_runs ar ON ar.automation_id = a.id
           GROUP BY a.client_id
       ) rs ON rs.client_id = c.id
      ${where}
      GROUP BY c.id, c.name, c.legal_name, c.cnpj, c.status, c.fee_amount, c.unit, c.health_score, c.started_at, c.last_review_at, c.created_at, c.updated_at, c.notes, rs.total_runs, rs.success_runs, rs.error_runs
      ORDER BY c.name ASC
      LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  
  // Strip out notes in payload but compute accesses
  function parseAccesses(notesString) {
    if (!notesString || !notesString.trim()) return [];
    try {
      const parsed = JSON.parse(notesString);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => {
          if (!item || typeof item !== "object") return false;
          if (item.id === "legacy") return false;
          if (item.title && (item.title.includes("Legado") || item.title.includes("Acesso Geral"))) return false;
          return true;
        });
      }
    } catch (e) {
      // plain text or formatting error
    }
    return [];
  }

  const mapped = rows.map(r => {
    const accessesCount = parseAccesses(r.notes).length;
    const { notes, ...rest } = r;
    return { ...rest, accessesCount };
  });

  ok(res, { data: mapped });
}));

clientRoutes.post('/', requirePermission('clients.create'), audit('client', 'create'), asyncHandler(async (req, res) => {
  const { name, legalName, cnpj, status = 'active', feeAmount, unit, notes } = req.body || {};
  if (!name) throw new HttpError(400, 'Client name is required.');

  const id = createId();
  await query(
    `INSERT INTO clients (id, organization_id, name, legal_name, cnpj, status, fee_amount, unit, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user.organization_id, name, legalName || null, cnpj || null, status, feeAmount || null, unit || null, notes || null]
  );

  const { rows } = await query(`SELECT * FROM clients WHERE id = ?`, [id]);
  created(res, rows[0]);
}));

clientRoutes.get('/:id', requirePermission('clients.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT * FROM clients WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  if (!rows[0]) throw new HttpError(404, 'Client not found.');

  const tools = await query(`SELECT * FROM client_tools WHERE client_id = ? ORDER BY created_at DESC`, [req.params.id]);
  const automations = await query(`SELECT * FROM automations WHERE client_id = ? ORDER BY updated_at DESC`, [req.params.id]);
  const bots = await query(`SELECT * FROM bots WHERE client_id = ? ORDER BY updated_at DESC`, [req.params.id]);
  const instances = await query(`SELECT * FROM whatsapp_instances WHERE client_id = ? ORDER BY updated_at DESC`, [req.params.id]);
  const docs = await query(`SELECT * FROM documents WHERE client_id = ? ORDER BY updated_at DESC`, [req.params.id]);

  ok(res, {
    ...rows[0],
    tools: tools.rows,
    automations: await attachAutomationRuns(automations.rows),
    bots: bots.rows,
    instances: instances.rows,
    docs: docs.rows,
  });
}));

clientRoutes.patch('/:id', requirePermission('clients.update'), audit('client', 'update'), asyncHandler(async (req, res) => {
  const current = await query(`SELECT * FROM clients WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  if (!current.rows[0]) throw new HttpError(404, 'Client not found.');

  const previous = current.rows[0];
  res.locals.auditBefore = previous;
  const { name, legalName, cnpj, status, feeAmount, unit, notes, healthScore } = req.body || {};

  await query(
    `UPDATE clients
        SET name = ?, legal_name = ?, cnpj = ?, status = ?, fee_amount = ?, unit = ?, notes = ?, health_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?`,
    [
      name ?? previous.name,
      legalName ?? previous.legal_name,
      cnpj ?? previous.cnpj,
      status ?? previous.status,
      feeAmount ?? previous.fee_amount,
      unit ?? previous.unit,
      notes ?? previous.notes,
      healthScore ?? previous.health_score,
      req.params.id,
      req.user.organization_id,
    ]
  );

  const { rows } = await query(`SELECT * FROM clients WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  ok(res, rows[0]);
}));
