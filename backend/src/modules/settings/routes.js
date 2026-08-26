import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission, requireAdmin } from '../../middleware/auth.js';
import { createId } from '../../utils/id.js';

export const settingsRoutes = Router();
settingsRoutes.use(authenticate, requireAdmin);

// Maps route param to DB table name
const TABLE_MAP = {
  squads: 'teams',
  cargos: 'job_roles',
  senioridades: 'seniorities',
  areas: 'areas',
  'business-units': 'business_units'
};

// Middleware to resolve table from path param
function resolveTable(req, res, next) {
  const table = TABLE_MAP[req.params.type];
  if (!table) {
    return next(new HttpError(404, 'Tipo de configuração inválido.'));
  }
  req.targetTable = table;
  next();
}

// GET all items of a type
settingsRoutes.get('/:type', requirePermission('users.view'), resolveTable, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, slug, created_at, updated_at
       FROM ${req.targetTable}
      WHERE organization_id = ?
      ORDER BY name ASC`,
    [req.user.organization_id]
  );
  ok(res, { data: rows });
}));

// POST create a new item
settingsRoutes.post('/:type', requirePermission('users.create'), resolveTable, asyncHandler(async (req, res) => {
  const { name, slug } = req.body || {};
  if (!name) throw new HttpError(400, 'Name is required.');

  // Slugify if not provided
  const itemSlug = slug || String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  // Check uniqueness of slug
  const dupCheck = await query(
    `SELECT id FROM ${req.targetTable} WHERE organization_id = ? AND slug = ? LIMIT 1`,
    [req.user.organization_id, itemSlug]
  );
  if (dupCheck.rows[0]) {
    throw new HttpError(400, `Item com o slug "${itemSlug}" já existe.`);
  }

  const id = createId();
  await query(
    `INSERT INTO ${req.targetTable} (id, organization_id, name, slug)
     VALUES (?, ?, ?, ?)`,
    [id, req.user.organization_id, name, itemSlug]
  );

  const { rows } = await query(`SELECT * FROM ${req.targetTable} WHERE id = ?`, [id]);
  created(res, rows[0]);
}));

// PATCH update an item
settingsRoutes.patch('/:type/:id', requirePermission('users.update'), resolveTable, asyncHandler(async (req, res) => {
  const { name, slug } = req.body || {};

  const current = await query(
    `SELECT * FROM ${req.targetTable} WHERE id = ? AND organization_id = ?`,
    [req.params.id, req.user.organization_id]
  );
  if (!current.rows[0]) throw new HttpError(404, 'Item não encontrado.');
  const previous = current.rows[0];

  const nextName = name ?? previous.name;
  const nextSlug = slug ?? previous.slug;

  // Check unique slug if changed
  if (nextSlug !== previous.slug) {
    const dupCheck = await query(
      `SELECT id FROM ${req.targetTable} WHERE organization_id = ? AND slug = ? AND id != ? LIMIT 1`,
      [req.user.organization_id, nextSlug, req.params.id]
    );
    if (dupCheck.rows[0]) {
      throw new HttpError(400, `Item com o slug "${nextSlug}" já existe.`);
    }
  }

  await query(
    `UPDATE ${req.targetTable}
        SET name = ?, slug = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?`,
    [nextName, nextSlug, req.params.id, req.user.organization_id]
  );

  const { rows } = await query(`SELECT * FROM ${req.targetTable} WHERE id = ?`, [req.params.id]);
  ok(res, rows[0]);
}));

// DELETE an item
settingsRoutes.delete('/:type/:id', requirePermission('users.disable'), resolveTable, asyncHandler(async (req, res) => {
  const current = await query(
    `SELECT id FROM ${req.targetTable} WHERE id = ? AND organization_id = ?`,
    [req.params.id, req.user.organization_id]
  );
  if (!current.rows[0]) throw new HttpError(404, 'Item não encontrado.');

  await query(
    `DELETE FROM ${req.targetTable} WHERE id = ? AND organization_id = ?`,
    [req.params.id, req.user.organization_id]
  );
  ok(res, { ok: true });
}));
