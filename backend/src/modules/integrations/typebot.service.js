import { typebotPool } from '../../db/pool.js';
import { env } from '../../config/env.js';

export async function fetchTypebotSnapshot() {
  if (!typebotPool) return { configured: false, bots: [] };

  const [typebots, publicTypebots] = await Promise.all([
    typebotPool.query(`
      SELECT f.id AS folder_id,
             f.name AS folder_name,
             t.id AS typebot_id,
             t.name AS typebot_name,
             t."publicId" AS public_id,
             t."updatedAt" AS updated_at
        FROM "DashboardFolder" f
        LEFT JOIN "Typebot" t ON t."folderId" = f.id AND t."isArchived" = false
       WHERE f.name NOT IN ('New folder', 'Temas', 'FAVOR CRIAR UMA PASTA PARA CADA CLIENTE', 'TESTES', 'Validadores')
    `),
    typebotPool.query(`SELECT "typebotId" AS typebot_id FROM "PublicTypebot"`),
  ]);

  const publicIds = new Set(publicTypebots.rows.map((row) => row.typebot_id));

  return {
    configured: true,
    bots: typebots.rows.map((row) => ({
      ...row,
      is_published: publicIds.has(row.typebot_id),
      public_url: publicIds.has(row.typebot_id) && row.public_id && env.typebot.viewerBaseUrl
        ? `${env.typebot.viewerBaseUrl.replace(/\/$/, '')}/${row.public_id}`
        : null,
    })),
  };
}
