import { n8nPool } from '../../db/pool.js';
import { env } from '../../config/env.js';

// These tags are NOT client names — they are technical/internal labels
const technicalTags = new Set([
  'cliente', 'envio relatorio', 'envio relatório', 'facebook ads',
  'error-notification', 'feejo', 'performance', 'jony ai',
]);

function isClientTag(tagName) {
  return !technicalTags.has((tagName || '').toLowerCase().trim());
}

export async function fetchN8nSnapshot() {
  if (!n8nPool) return { configured: false, workflows: [], executions: [] };

  // Fetch only workflows that have at least one non-technical client tag
  // by filtering out purely technical tag names from the result set
  const technicalTagsArray = [...technicalTags];
  const workflowsQuery = `
    SELECT w.id AS workflow_id, w.name AS workflow_name, w.active AS is_active, t.name AS tag_name
      FROM workflow_entity w
      JOIN workflows_tags wt ON w.id = wt."workflowId"
      JOIN tag_entity t ON t.id = wt."tagId"
     WHERE w.id IN (
       SELECT DISTINCT wt2."workflowId"
       FROM workflows_tags wt2
       JOIN tag_entity t2 ON t2.id = wt2."tagId"
       WHERE LOWER(t2.name) <> ALL($1)
     )
     ORDER BY w.id
  `;

  const executionsQuery = `
    SELECT id, status, "workflowId" AS workflow_id, "startedAt" AS started_at, "stoppedAt" AS stopped_at, mode
      FROM (
        SELECT id, status, "workflowId", "startedAt", "stoppedAt", mode,
               ROW_NUMBER() OVER(PARTITION BY "workflowId" ORDER BY id DESC) AS rn
          FROM execution_entity
         WHERE "startedAt" >= NOW() - INTERVAL '7 days'
      ) t
     WHERE rn <= 10
  `;

  const [workflows, executions] = await Promise.all([
    n8nPool.query(workflowsQuery, [technicalTagsArray]),
    n8nPool.query(executionsQuery),
  ]);

  // Deduplicate: one entry per workflow_id, prefer the first non-technical tag as client name
  const workflowMap = new Map();
  for (const row of workflows.rows) {
    const wid = row.workflow_id;
    if (!workflowMap.has(wid)) {
      workflowMap.set(wid, {
        workflow_id: wid,
        workflow_name: row.workflow_name,
        is_active: row.is_active,
        tag_name: null,
      });
    }
    // Assign client name if we don't have one yet and this tag is a client tag
    if (!workflowMap.get(wid).tag_name && isClientTag(row.tag_name)) {
      workflowMap.get(wid).tag_name = row.tag_name;
    }
  }

  // Only keep workflows that have a client tag
  const processedWorkflows = [...workflowMap.values()].filter(w => w.tag_name !== null);

  return {
    configured: true,
    baseUrl: env.n8n.baseUrl,
    workflows: processedWorkflows,
    executions: executions.rows,
  };
}
