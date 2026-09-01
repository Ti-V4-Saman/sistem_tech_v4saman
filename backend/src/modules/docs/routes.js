import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, created, HttpError, ok } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { createId, slugify } from '../../utils/id.js';

export const docRoutes = Router();
docRoutes.use(authenticate);

const DOC_TEMPLATES = [
  {
    id: 'procedimento-operacional',
    name: 'Procedimento Operacional',
    description: 'Template para documentar procedimentos técnicos passo a passo.',
    content: '<h1>Procedimento Operacional</h1><h2>Objetivo</h2><p>Descreva o objetivo deste procedimento.</p><h2>Pré-requisitos</h2><ul><li>Requisito 1</li><li>Requisito 2</li></ul><h2>Passo a Passo</h2><ol><li>Primeiro passo</li><li>Segundo passo</li><li>Terceiro passo</li></ol><h2>Observações</h2><p>Notas adicionais aqui.</p>',
  },
  {
    id: 'guia-tecnico',
    name: 'Guia Técnico',
    description: 'Template para documentação técnica de integrações e ferramentas.',
    content: '<h1>Guia Técnico</h1><h2>Visão Geral</h2><p>Descrição geral da tecnologia ou integração.</p><h2>Arquitetura</h2><p>Explique a arquitetura e os componentes envolvidos.</p><h2>Configuração</h2><h3>Variáveis de Ambiente</h3><p><code>API_KEY=sua_chave</code></p><h3>Instalação</h3><ol><li>Clone o repositório</li><li>Configure as variáveis</li><li>Execute o serviço</li></ol><h2>Troubleshooting</h2><p>Problemas conhecidos e soluções.</p>',
  },
  {
    id: 'relatorio',
    name: 'Relatório',
    description: 'Template para relatórios periódicos e análises.',
    content: '<h1>Relatório</h1><h2>Resumo Executivo</h2><p>Síntese dos pontos principais.</p><h2>Métricas</h2><p>Apresente os dados e indicadores relevantes.</p><h2>Análise</h2><p>Interpretação dos resultados.</p><h2>Recomendações</h2><ul><li>Recomendação 1</li><li>Recomendação 2</li></ul><h2>Próximos Passos</h2><p>Ações a serem tomadas.</p>',
  },
  {
    id: 'checklist-onboarding',
    name: 'Checklist de Onboarding',
    description: 'Template para onboarding de novos clientes ou colaboradores.',
    content: '<h1>Checklist de Onboarding</h1><h2>Dados do Cliente</h2><p><strong>Nome:</strong> </p><p><strong>Empresa:</strong> </p><p><strong>Contato:</strong> </p><h2>Tarefas</h2><ul><li>[ ] Criar conta no sistema</li><li>[ ] Configurar integrações</li><li>[ ] Enviar credenciais de acesso</li><li>[ ] Agendar reunião de kickoff</li><li>[ ] Validar fluxos de automação</li></ul><h2>Observações</h2><p>Notas adicionais.</p>',
  },
];

function mapDoc(row, tagMap = new Map()) {
  const tags = tagMap.get(row.id) || [];
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    slug: row.slug,
    content: row.content || '',
    status: row.status,
    category: row.category || '',
    visibility: row.visibility,
    author: row.author_name || 'Sistema',
    authorUserId: row.author_user_id,
    tags,
    type: row.category === 'PDF' ? 'pdf' : row.category === 'DOCX' ? 'docx' : 'document',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modifiedAt: row.updated_at,
  };
}

async function getDocumentRows(whereSql = '', params = []) {
  const { rows } = await query(
    `SELECT d.*, u.name AS author_name
       FROM documents d
       LEFT JOIN users u ON u.id = d.author_user_id
      ${whereSql}
      ORDER BY d.updated_at DESC
      LIMIT 200`,
    params
  );

  if (rows.length === 0) return [];

  const placeholders = rows.map(() => '?').join(',');
  const tags = await query(
    `SELECT dt.document_id, t.name, t.color
       FROM document_tags dt
       JOIN tags t ON t.id = dt.tag_id
      WHERE dt.document_id IN (${placeholders})
      ORDER BY t.name ASC`,
    rows.map((row) => row.id)
  );

  const tagMap = new Map();
  for (const tag of tags.rows) {
    if (!tagMap.has(tag.document_id)) tagMap.set(tag.document_id, []);
    tagMap.get(tag.document_id).push(tag.name);
  }

  return rows.map((row) => mapDoc(row, tagMap));
}

async function syncDocumentTags(documentId, organizationId, tagNames = []) {
  if (!Array.isArray(tagNames)) return;
  await query(`DELETE FROM document_tags WHERE document_id = ?`, [documentId]);

  for (const rawName of tagNames) {
    const name = String(rawName || '').trim();
    if (!name) continue;
    await query(
      `INSERT INTO tags (id, organization_id, name, color)
       VALUES (?, ?, ?, '#e92e30')
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [createId(), organizationId, name]
    );
    const tag = await query(`SELECT id FROM tags WHERE organization_id = ? AND name = ? LIMIT 1`, [organizationId, name]);
    if (tag.rows[0]) {
      await query(`INSERT IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)`, [documentId, tag.rows[0].id]);
    }
  }
}

docRoutes.get('/templates', requirePermission('docs.view'), asyncHandler(async (req, res) => {
  ok(res, { data: DOC_TEMPLATES });
}));

docRoutes.get('/tags', requirePermission('docs.view'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, color, created_at
       FROM tags
      WHERE organization_id = ?
      ORDER BY name ASC`,
    [req.user.organization_id]
  );
  ok(res, { data: rows });
}));

docRoutes.post('/tags', requirePermission('docs.update'), audit('tag', 'create'), asyncHandler(async (req, res) => {
  const { name, color = '#e92e30' } = req.body || {};
  if (!name) throw new HttpError(400, 'Tag name is required.');
  await query(
    `INSERT INTO tags (id, organization_id, name, color)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE color = VALUES(color)`,
    [createId(), req.user.organization_id, String(name).trim(), color]
  );
  const { rows } = await query(`SELECT id, name, color FROM tags WHERE organization_id = ? AND name = ? LIMIT 1`, [req.user.organization_id, String(name).trim()]);
  created(res, rows[0]);
}));

docRoutes.delete('/tags/:id', requirePermission('docs.update'), audit('tag', 'delete'), asyncHandler(async (req, res) => {
  await query(`DELETE FROM tags WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  ok(res, { ok: true });
}));

docRoutes.get('/', requirePermission('docs.view'), asyncHandler(async (req, res) => {
  let whereSql = 'WHERE d.organization_id = ?';
  let params = [req.user.organization_id];

  if (req.user.access_role_slug !== 'admin' && req.user.access_role_slug !== 'super-admin') {
    whereSql += ` AND (
      d.author_user_id = ? 
      OR (
        d.status = 'published' 
        AND (
          NOT EXISTS (
            SELECT 1 FROM document_tags dt WHERE dt.document_id = d.id
          )
          OR EXISTS (
            SELECT 1 FROM document_tags dt
            JOIN tags t ON t.id = dt.tag_id
            WHERE dt.document_id = d.id 
              AND (
                LOWER(t.name) = 'todos'
                OR LOWER(t.name) = ?
                OR LOWER(t.name) = ?
              )
          )
        )
      )
    )`;
    params.push(req.user.id, (req.user.job_role_name || '').toLowerCase(), (req.user.team_name || '').toLowerCase());
  }

  const docs = await getDocumentRows(whereSql, params);
  ok(res, { data: docs });
}));

docRoutes.get('/:id', requirePermission('docs.view'), asyncHandler(async (req, res) => {
  let whereSql = 'WHERE d.id = ? AND d.organization_id = ?';
  let params = [req.params.id, req.user.organization_id];

  if (req.user.access_role_slug !== 'admin' && req.user.access_role_slug !== 'super-admin') {
    whereSql += ` AND (
      d.author_user_id = ?
      OR (
        d.status = 'published'
        AND (
          NOT EXISTS (
            SELECT 1 FROM document_tags dt WHERE dt.document_id = d.id
          )
          OR EXISTS (
            SELECT 1 FROM document_tags dt
            JOIN tags t ON t.id = dt.tag_id
            WHERE dt.document_id = d.id 
              AND (
                LOWER(t.name) = 'todos'
                OR LOWER(t.name) = ?
                OR LOWER(t.name) = ?
              )
          )
        )
      )
    )`;
    params.push(req.user.id, (req.user.job_role_name || '').toLowerCase(), (req.user.team_name || '').toLowerCase());
  }

  const docs = await getDocumentRows(whereSql, params);
  if (!docs[0]) throw new HttpError(404, 'Document not found.');
  ok(res, docs[0]);
}));

docRoutes.post('/', requirePermission('docs.create'), audit('document', 'create'), asyncHandler(async (req, res) => {
  if (req.user.access_role_slug !== 'admin' && req.user.access_role_slug !== 'super-admin') {
    throw new HttpError(403, 'Apenas administradores e super-admins podem criar documentos.');
  }

  const { clientId, title, content, category, visibility = 'internal', tags = [], status = 'draft', type = 'document' } = req.body || {};
  if (!title) throw new HttpError(400, 'Title is required.');

  const id = createId();
  const finalCategory = category || (type === 'pdf' ? 'PDF' : type === 'docx' ? 'DOCX' : null);
  await query(
    `INSERT INTO documents (id, organization_id, client_id, title, slug, content, category, visibility, status, author_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user.organization_id, clientId || null, title, slugify(title), content || '', finalCategory, visibility, status, req.user.id]
  );
  await syncDocumentTags(id, req.user.organization_id, tags);

  const docs = await getDocumentRows('WHERE d.id = ? AND d.organization_id = ?', [id, req.user.organization_id]);
  created(res, docs[0]);
}));

docRoutes.patch('/:id', requirePermission('docs.update'), audit('document', 'update'), asyncHandler(async (req, res) => {
  const current = await query(`SELECT * FROM documents WHERE id = ? AND organization_id = ? LIMIT 1`, [req.params.id, req.user.organization_id]);
  if (!current.rows[0]) throw new HttpError(404, 'Document not found.');

  const previous = current.rows[0];
  const isAuthor = previous.author_user_id === req.user.id;
  const isAdmin = req.user.access_role_slug === 'admin' || req.user.access_role_slug === 'super-admin';
  if (!isAuthor && !isAdmin) {
    throw new HttpError(403, 'Você não tem permissão para editar este documento.');
  }
  res.locals.auditBefore = previous;

  const { title, content, category, visibility, status, tags } = req.body || {};

  await query(
    `UPDATE documents
        SET title = ?, slug = ?, content = ?, category = ?, visibility = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?`,
    [
      title ?? previous.title,
      title ? slugify(title) : previous.slug,
      content ?? previous.content,
      category ?? previous.category,
      visibility ?? previous.visibility,
      status ?? previous.status,
      req.params.id,
      req.user.organization_id,
    ]
  );

  if (Array.isArray(tags)) await syncDocumentTags(req.params.id, req.user.organization_id, tags);

  const docs = await getDocumentRows('WHERE d.id = ? AND d.organization_id = ?', [req.params.id, req.user.organization_id]);
  ok(res, docs[0]);
}));

docRoutes.delete('/:id', requirePermission('docs.archive'), audit('document', 'archive'), asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT id, author_user_id FROM documents WHERE id = ? AND organization_id = ? LIMIT 1`, [req.params.id, req.user.organization_id]);
  if (!rows[0]) throw new HttpError(404, 'Document not found.');

  const isAuthor = rows[0].author_user_id === req.user.id;
  const isAdmin = req.user.access_role_slug === 'admin' || req.user.access_role_slug === 'super-admin';
  if (!isAuthor && !isAdmin) {
    throw new HttpError(403, 'Você não tem permissão para excluir este documento.');
  }
  res.locals.auditBefore = rows[0];

  // Remove associações de tags antes de excluir para evitar registros órfãos
  await query(`DELETE FROM document_tags WHERE document_id = ?`, [req.params.id]);
  await query(`DELETE FROM documents WHERE id = ? AND organization_id = ?`, [req.params.id, req.user.organization_id]);
  ok(res, { ok: true });
}));

docRoutes.post('/:id/publish', requirePermission('docs.publish'), audit('document', 'publish'), asyncHandler(async (req, res) => {
  if (req.user.access_role_slug !== 'admin' && req.user.access_role_slug !== 'super-admin') {
    throw new HttpError(403, 'Apenas administradores podem publicar documentos.');
  }
  const current = await query(`SELECT * FROM documents WHERE id = ? AND organization_id = ? LIMIT 1`, [req.params.id, req.user.organization_id]);
  if (!current.rows[0]) throw new HttpError(404, 'Document not found.');
  res.locals.auditBefore = current.rows[0];

  await query(
    `UPDATE documents SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ?`,
    [req.params.id, req.user.organization_id]
  );
  const docs = await getDocumentRows('WHERE d.id = ? AND d.organization_id = ?', [req.params.id, req.user.organization_id]);
  if (!docs[0]) throw new HttpError(404, 'Document not found.');
  ok(res, docs[0]);
}));
