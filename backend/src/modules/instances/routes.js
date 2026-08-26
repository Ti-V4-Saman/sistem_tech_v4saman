import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const instanceRoutes = Router();
instanceRoutes.use(authenticate);

instanceRoutes.get('/', requirePermission('instances.view'), asyncHandler(async (req, res) => {
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 100, 1), 200);
  const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);

  let where = 'WHERE c.organization_id = ?';
  const params = [req.user.organization_id];
  if (search) {
    where += ` AND (wi.name LIKE ? OR wi.phone_number LIKE ? OR wi.provider LIKE ? OR c.name LIKE ?)`;
    params.push(search, search, search, search);
  }

  const { rows } = await query(
    `SELECT wi.*,
            c.name AS client_name,
            ct.name AS client_tool_name
       FROM whatsapp_instances wi
       JOIN clients c ON c.id = wi.client_id
       LEFT JOIN client_tools ct ON ct.id = wi.client_tool_id
      ${where}
      ORDER BY wi.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  ok(res, { data: rows });
}));
