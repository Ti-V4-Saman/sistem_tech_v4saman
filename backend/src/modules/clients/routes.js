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
  const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 50, 1000);
  const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);

  const orgId = req.user.organization_id;
  const params = [orgId];
  let where = 'WHERE c.organization_id = ?';
  if (search) {
    where += ' AND (c.name LIKE ? OR c.legal_name LIKE ? OR c.cnpj LIKE ?)';
    params.push(search, search, search);
  }

  const role = req.user.access_role_slug;
  if (role !== 'admin' && role !== 'super-admin') {
    if (req.user.team_name) {
      where += ' AND c.unit = ?';
      params.push(req.user.team_name);
    } else {
      where += ' AND 1 = 0'; // Se o usuário não tem time, não vê clientes
    }
  }

  const { rows } = await query(
    `SELECT c.id,
            c.name,
            c.legal_name,
            c.cnpj,
            CASE 
              WHEN c.status = 'active' AND 
                   COALESCE(a.active_automations, 0) = 0 AND
                   COALESCE(b.published_bots, 0) = 0
              THEN 'inactive'
              ELSE c.status 
            END AS status,
            c.fee_amount,
            c.unit,
            c.quiz,
            c.lps,
            c.health_score,
            c.started_at,
            c.last_review_at,
            c.created_at,
            c.updated_at,
            COALESCE(a.total_automations, 0) AS total_automations,
            COALESCE(a.active_automations, 0) AS active_automations,
            COALESCE(b.total_bots, 0) AS total_bots,
            COALESCE(b.published_bots, 0) AS published_bots,
            COALESCE(b.quiz_bots_count, 0) AS quiz_bots_count,
            COALESCE(b.lp_bots_count, 0) AS lp_bots_count,
            c.notes
       FROM clients c
       LEFT JOIN (
          SELECT a.client_id,
                 COUNT(*) AS total_automations,
                 SUM(CASE WHEN a.status = 'active' OR a.is_active = 1 THEN 1 ELSE 0 END) AS active_automations
            FROM automations a
            JOIN clients ac ON ac.id = a.client_id
           WHERE ac.organization_id = ?
           GROUP BY a.client_id
       ) a ON a.client_id = c.id
       LEFT JOIN (
          SELECT b.client_id,
                 COUNT(*) AS total_bots,
                 SUM(CASE WHEN b.status = 'active' OR b.is_published = 1 THEN 1 ELSE 0 END) AS published_bots,
                 SUM(CASE WHEN LOWER(b.name) LIKE '%quiz%' THEN 1 ELSE 0 END) AS quiz_bots_count,
                 SUM(CASE WHEN LOWER(b.name) LIKE '%lp%' OR LOWER(b.name) LIKE '%landing%' THEN 1 ELSE 0 END) AS lp_bots_count
            FROM bots b
            JOIN clients bc ON bc.id = b.client_id
           WHERE bc.organization_id = ?
           GROUP BY b.client_id
       ) b ON b.client_id = c.id
      ${where}
      ORDER BY c.name ASC
      LIMIT ${limit} OFFSET ${offset}`,
    [orgId, orgId, ...params]
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
  const { name, legalName, cnpj, status = 'active', feeAmount, unit, quiz, lps, notes } = req.body || {};
  if (!name) throw new HttpError(400, 'Client name is required.');

  const id = createId();
  await query(
    `INSERT INTO clients (id, organization_id, name, legal_name, cnpj, status, fee_amount, unit, quiz, lps, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user.organization_id, name, legalName || null, cnpj || null, status, feeAmount || null, unit || null, quiz || null, lps || null, notes || null]
  );

  const { rows } = await query(`SELECT * FROM clients WHERE id = ?`, [id]);
  created(res, rows[0]);
}));

clientRoutes.get('/:id', requirePermission('clients.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT * FROM clients WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  if (!rows[0]) throw new HttpError(404, 'Client not found.');

  const role = req.user.access_role_slug;
  if (role !== 'admin' && role !== 'super-admin') {
    if (!req.user.team_name || (rows[0].unit && rows[0].unit.toLowerCase() !== req.user.team_name.toLowerCase())) {
      throw new HttpError(403, 'Acesso negado: você só pode acessar clientes do seu squad.');
    }
  }

  const [tools, automations, bots, instances, docs] = await Promise.all([
    query(`SELECT * FROM client_tools WHERE client_id = ? ORDER BY created_at DESC`, [req.params.id]),
    query(`SELECT * FROM automations WHERE client_id = ? ORDER BY updated_at DESC`, [req.params.id]),
    query(`SELECT * FROM bots WHERE client_id = ? ORDER BY updated_at DESC`, [req.params.id]),
    query(`SELECT * FROM whatsapp_instances WHERE client_id = ? ORDER BY updated_at DESC`, [req.params.id]),
    query(`SELECT id, title, slug, category, status, updated_at FROM documents WHERE client_id = ? ORDER BY updated_at DESC`, [req.params.id]),
  ]);

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

  const role = req.user.access_role_slug;
  if (role !== 'admin' && role !== 'super-admin') {
    if (!req.user.team_name || (current.rows[0].unit && current.rows[0].unit.toLowerCase() !== req.user.team_name.toLowerCase())) {
      throw new HttpError(403, 'Acesso negado: você só pode atualizar clientes do seu squad.');
    }
  }

  const previous = current.rows[0];
  res.locals.auditBefore = previous;
  const { name, legalName, cnpj, status, feeAmount, unit, quiz, lps, notes, healthScore } = req.body || {};

  await query(
    `UPDATE clients
        SET name = ?, legal_name = ?, cnpj = ?, status = ?, fee_amount = ?, unit = ?, quiz = ?, lps = ?, notes = ?, health_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?`,
    [
      name ?? previous.name,
      legalName ?? previous.legal_name,
      cnpj ?? previous.cnpj,
      status ?? previous.status,
      feeAmount ?? previous.fee_amount,
      unit ?? previous.unit,
      quiz ?? previous.quiz,
      lps ?? previous.lps,
      notes ?? previous.notes,
      healthScore ?? previous.health_score,
      req.params.id,
      req.user.organization_id,
    ]
  );

  const { rows } = await query(`SELECT * FROM clients WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  ok(res, rows[0]);
}));
