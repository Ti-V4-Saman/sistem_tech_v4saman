import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { createId } from '../../utils/id.js';

export const flowTemplateRoutes = Router();
flowTemplateRoutes.use(authenticate);

// List templates (for normal users, don't expose webhook_url)
flowTemplateRoutes.get('/', requirePermission('flows.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, organization_id, name, slug, description, category, form_schema, is_active, display_order, 
            CASE WHEN webhook_url IS NOT NULL AND webhook_url != '' THEN true ELSE false END as has_webhook,
            created_at, updated_at
     FROM flow_templates 
     WHERE organization_id = ? 
     ORDER BY display_order ASC, name ASC`,
    [req.user.organization_id]
  );
  ok(res, { data: rows });
}));

// Admin list templates (exposes webhook_url)
flowTemplateRoutes.get('/admin', requirePermission('flows.manage'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM flow_templates 
     WHERE organization_id = ? 
     ORDER BY display_order ASC, name ASC`,
    [req.user.organization_id]
  );
  ok(res, { data: rows });
}));

flowTemplateRoutes.post('/', requirePermission('flows.manage'), audit('flow_template', 'create'), asyncHandler(async (req, res) => {
  const { name, slug, description, category, webhook_url, form_schema, is_active, display_order } = req.body || {};
  if (!name || !slug) throw new HttpError(400, 'Name and slug are required.');

  try {
    const [result] = await query(
      `INSERT INTO flow_templates (organization_id, name, slug, description, category, webhook_url, form_schema, is_active, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.organization_id, name, slug, description || null, category || null, webhook_url || null, form_schema ? JSON.stringify(form_schema) : null, is_active !== undefined ? is_active : true, display_order || 0]
    );
    const { rows } = await query(`SELECT * FROM flow_templates WHERE id = ?`, [result.insertId]);
    created(res, rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new HttpError(400, 'Já existe um modelo com este slug.');
    }
    throw err;
  }
}));

flowTemplateRoutes.patch('/:id', requirePermission('flows.manage'), audit('flow_template', 'update'), asyncHandler(async (req, res) => {
  const current = await query(`SELECT * FROM flow_templates WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  if (!current.rows[0]) throw new HttpError(404, 'Template not found.');

  const previous = current.rows[0];
  res.locals.auditBefore = previous;
  const { name, slug, description, category, webhook_url, form_schema, is_active, display_order } = req.body || {};

  try {
    await query(
      `UPDATE flow_templates
          SET name = ?, slug = ?, description = ?, category = ?, webhook_url = ?, form_schema = ?, is_active = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND organization_id = ?`,
      [
        name !== undefined ? name : previous.name,
        slug !== undefined ? slug : previous.slug,
        description !== undefined ? description : previous.description,
        category !== undefined ? category : previous.category,
        webhook_url !== undefined ? webhook_url : previous.webhook_url,
        form_schema !== undefined ? JSON.stringify(form_schema) : previous.form_schema,
        is_active !== undefined ? is_active : previous.is_active,
        display_order !== undefined ? display_order : previous.display_order,
        req.params.id,
        req.user.organization_id,
      ]
    );
    const { rows } = await query(`SELECT * FROM flow_templates WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
    ok(res, rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new HttpError(400, 'Já existe um modelo com este slug.');
    }
    throw err;
  }
}));

// List requests history
flowTemplateRoutes.get('/requests', requirePermission('flows.view'), asyncHandler(async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 50, 100);
  const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);

  const { rows } = await query(
    `SELECT fr.*, ft.name as template_name, ft.slug as template_slug 
     FROM flow_requests fr
     JOIN flow_templates ft ON ft.id = fr.template_id
     WHERE fr.organization_id = ?
     ORDER BY fr.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    [req.user.organization_id]
  );
  
  const countQuery = await query(`SELECT COUNT(*) as count FROM flow_requests WHERE organization_id = ?`, [req.user.organization_id]);
  
  ok(res, { data: rows, total: countQuery.rows[0].count });
}));

// Execute webhook
flowTemplateRoutes.post('/:id/execute', requirePermission('flows.view'), audit('flow_template', 'execute'), asyncHandler(async (req, res) => {
  const { payload, client_id, idempotency_key } = req.body || {};
  if (!idempotency_key) throw new HttpError(400, 'Idempotency key is required to prevent double submissions.');

  const orgId = req.user.organization_id;
  const templateId = req.params.id;

  // Verify template exists and is active
  const { rows: tpls } = await query(`SELECT * FROM flow_templates WHERE id = ? AND organization_id = ?`, [templateId, orgId]);
  if (!tpls[0]) throw new HttpError(404, 'Template not found.');
  const template = tpls[0];

  if (!template.is_active) throw new HttpError(400, 'Este modelo está desativado.');
  if (!template.webhook_url) throw new HttpError(400, 'Nenhum webhook configurado para este modelo.');

  const requestId = createId();
  
  try {
    // Insert pending request
    await query(
      `INSERT INTO flow_requests (id, organization_id, template_id, requested_by_user_id, client_id, payload, status, idempotency_key, started_at)
       VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, CURRENT_TIMESTAMP)`,
      [requestId, orgId, templateId, req.user.id, client_id || null, JSON.stringify(payload), idempotency_key]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'Esta solicitação já foi processada.');
    }
    throw err;
  }

  // Execute external request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

  try {
    const fetchResponse = await fetch(template.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const isSuccess = fetchResponse.ok;
    const status = isSuccess ? 'success' : 'error';
    const httpStatus = fetchResponse.status;
    let responseText = '';
    
    try {
      responseText = await fetchResponse.text();
    } catch (e) {
      responseText = 'Error reading response body';
    }

    await query(
      `UPDATE flow_requests 
       SET status = ?, http_status = ?, response = ?, error_message = ?, finished_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, httpStatus, responseText, isSuccess ? null : `HTTP Error ${httpStatus}`, requestId]
    );

    if (isSuccess) {
      ok(res, { success: true, request_id: requestId, message: 'Disparo efetuado com sucesso.' });
    } else {
      throw new HttpError(502, `Falha no disparo: HTTP ${httpStatus}`);
    }

  } catch (err) {
    clearTimeout(timeoutId);
    
    const isTimeout = err.name === 'AbortError';
    const errorMsg = isTimeout ? 'Timeout ao tentar contactar o n8n.' : (err.message || 'Erro desconhecido');

    await query(
      `UPDATE flow_requests 
       SET status = 'error', error_message = ?, finished_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [errorMsg, requestId]
    );

    throw new HttpError(502, `Falha na integração: ${errorMsg}`);
  }
}));
