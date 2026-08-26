import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';

export const telephonyRoutes = Router();
telephonyRoutes.use(authenticate);

telephonyRoutes.get('/summary', requirePermission('telephony.view'), asyncHandler(async (req, res) => {
  const { rows: generalRows } = await query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as active,
       SUM(CASE WHEN status = 'aguardando_ativacao' THEN 1 ELSE 0 END) as waiting,
       SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as inactive,
       SUM(monthly_fee) as total_cost
     FROM phone_numbers 
     WHERE organization_id = ?`,
    [req.user.organization_id]
  );

  const { rows: teamRows } = await query(
    `SELECT 
       COALESCE(team_name, 'Sem time') as team_name,
       COUNT(*) as total,
       SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as active,
       SUM(CASE WHEN status = 'aguardando_ativacao' THEN 1 ELSE 0 END) as waiting,
       SUM(monthly_fee) as team_cost
     FROM phone_numbers
     WHERE organization_id = ?
     GROUP BY COALESCE(team_name, 'Sem time')
     ORDER BY team_cost DESC`,
    [req.user.organization_id]
  );

  ok(res, {
    general: generalRows[0],
    teams: teamRows
  });
}));

telephonyRoutes.get('/export/csv', requirePermission('telephony.export'), asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM phone_numbers WHERE organization_id = ? ORDER BY created_at DESC', [req.user.organization_id]);
  
  if (!rows || rows.length === 0) {
    return res.status(200).send('Nenhum dado encontrado');
  }

  const headers = ['id', 'normalized_number', 'display_number', 'category', 'routing', 'monthly_fee', 'status', 'responsible_name', 'sector', 'team_name', 'notes'];
  let csv = headers.join(',') + '\n';
  
  for (const row of rows) {
    const line = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return val;
    });
    csv += line.join(',') + '\n';
  }

  res.header('Content-Type', 'text/csv');
  res.attachment('telefonia_export.csv');
  return res.send(csv);
}));

telephonyRoutes.get('/export/sql', requirePermission('telephony.export'), asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM phone_numbers WHERE organization_id = ? ORDER BY created_at ASC', [req.user.organization_id]);
  
  let sql = '-- Telephony Data Export\\n';
  if (rows && rows.length > 0) {
    sql += 'INSERT IGNORE INTO phone_numbers (organization_id, normalized_number, display_number, category, routing, monthly_fee, status, responsible_name, sector, team_name, notes) VALUES\\n';
    const values = rows.map(row => {
      const esc = (val) => val === null ? 'NULL' : (typeof val === 'number' ? val : `'${String(val).replace(/'/g, "''")}'`);
      return `(${esc(row.organization_id)}, ${esc(row.normalized_number)}, ${esc(row.display_number)}, ${esc(row.category)}, ${esc(row.routing)}, ${esc(row.monthly_fee)}, ${esc(row.status)}, ${esc(row.responsible_name)}, ${esc(row.sector)}, ${esc(row.team_name)}, ${esc(row.notes)})`;
    });
    sql += values.join(',\\n') + ';\\n';
  }

  res.header('Content-Type', 'application/sql');
  res.attachment('telefonia_export.sql');
  return res.send(sql);
}));

telephonyRoutes.get('/', requirePermission('telephony.view'), asyncHandler(async (req, res) => {
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;
  const category = req.query.category;
  const status = req.query.status;
  const team = req.query.team;
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 50, 100);
  const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);

  const params = [req.user.organization_id];
  let where = 'WHERE organization_id = ?';

  if (search) {
    where += ' AND (normalized_number LIKE ? OR display_number LIKE ? OR responsible_name LIKE ? OR sector LIKE ? OR routing LIKE ?)';
    params.push(search, search, search, search, search);
  }
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (team) {
    if (team === 'Sem time') {
      where += ' AND team_name IS NULL';
    } else {
      where += ' AND team_name = ?';
      params.push(team);
    }
  }

  const { rows } = await query(
    `SELECT * FROM phone_numbers ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  
  const countQuery = await query(`SELECT COUNT(*) as count FROM phone_numbers ${where}`, params);

  ok(res, { data: rows, total: countQuery.rows[0].count });
}));

telephonyRoutes.post('/', requirePermission('telephony.manage'), audit('telephony', 'create'), asyncHandler(async (req, res) => {
  const { normalized_number, display_number, category, routing, monthly_fee, status, responsible_name, sector, team_name, notes } = req.body || {};
  if (!normalized_number || !display_number || !category || !status) throw new HttpError(400, 'Missing required fields.');

  try {
    const [result] = await query(
      `INSERT INTO phone_numbers (organization_id, normalized_number, display_number, category, routing, monthly_fee, status, responsible_name, sector, team_name, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.organization_id, normalized_number, display_number, category, routing || null, monthly_fee || null, status, responsible_name || null, sector || null, team_name || null, notes || null]
    );
    const { rows } = await query(`SELECT * FROM phone_numbers WHERE id = ?`, [result.insertId]);
    created(res, rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new HttpError(400, 'Este número já está cadastrado.');
    }
    throw err;
  }
}));

telephonyRoutes.get('/:id', requirePermission('telephony.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT * FROM phone_numbers WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  if (!rows[0]) throw new HttpError(404, 'Number not found.');
  ok(res, rows[0]);
}));

telephonyRoutes.patch('/:id', requirePermission('telephony.manage'), audit('telephony', 'update'), asyncHandler(async (req, res) => {
  const current = await query(`SELECT * FROM phone_numbers WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  if (!current.rows[0]) throw new HttpError(404, 'Number not found.');

  const previous = current.rows[0];
  res.locals.auditBefore = previous;
  const { normalized_number, display_number, category, routing, monthly_fee, status, responsible_name, sector, team_name, notes } = req.body || {};

  try {
    await query(
      `UPDATE phone_numbers
          SET normalized_number = ?, display_number = ?, category = ?, routing = ?, monthly_fee = ?, status = ?, responsible_name = ?, sector = ?, team_name = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND organization_id = ?`,
      [
        normalized_number !== undefined ? normalized_number : previous.normalized_number,
        display_number !== undefined ? display_number : previous.display_number,
        category !== undefined ? category : previous.category,
        routing !== undefined ? routing : previous.routing,
        monthly_fee !== undefined ? monthly_fee : previous.monthly_fee,
        status !== undefined ? status : previous.status,
        responsible_name !== undefined ? responsible_name : previous.responsible_name,
        sector !== undefined ? sector : previous.sector,
        team_name !== undefined ? team_name : previous.team_name,
        notes !== undefined ? notes : previous.notes,
        req.params.id,
        req.user.organization_id,
      ]
    );
    const { rows } = await query(`SELECT * FROM phone_numbers WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
    ok(res, rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new HttpError(400, 'Este número já está cadastrado.');
    }
    throw err;
  }
}));

telephonyRoutes.delete('/:id', requirePermission('telephony.manage'), audit('telephony', 'delete'), asyncHandler(async (req, res) => {
  const current = await query(`SELECT * FROM phone_numbers WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  if (!current.rows[0]) throw new HttpError(404, 'Number not found.');

  res.locals.auditBefore = current.rows[0];
  await query(`DELETE FROM phone_numbers WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  ok(res, { success: true });
}));
