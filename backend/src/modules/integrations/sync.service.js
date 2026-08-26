import { query } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { createId } from '../../utils/id.js';
import { fetchN8nSnapshot } from './n8n.service.js';
import { fetchTypebotSnapshot } from './typebot.service.js';
import { processAutomationRunForAlerts } from '../alerts/alerts.service.js';

function withTimeout(promise, ms, rejectReason = 'Timeout') {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(rejectReason)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function cleanName(value) {
  return String(value || '').trim();
}

function toMysqlDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function durationMs(startedAt, stoppedAt) {
  if (!startedAt || !stoppedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(stoppedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, end - start);
}

async function getDefaultOrganizationId() {
  const { rows } = await query(
    `SELECT id FROM organizations WHERE slug = ? LIMIT 1`,
    [env.organization.slug]
  );

  if (rows[0]?.id) return rows[0].id;

  const id = createId();
  await query(
    `INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)`,
    [id, env.organization.name, env.organization.slug]
  );
  return id;
}

async function getOrCreateClient({ organizationId, name, source }) {
  const clientName = cleanName(name);
  if (!clientName) return null;

  const existing = await query(
    `SELECT id FROM clients
      WHERE organization_id = ?
        AND LOWER(TRIM(name)) = LOWER(TRIM(?))
      LIMIT 1`,
    [organizationId, clientName]
  );

  if (existing.rows[0]?.id) return existing.rows[0].id;

  const id = createId();
  await query(
    `INSERT INTO clients (id, organization_id, name, status, notes)
     VALUES (?, ?, ?, 'active', NULL)`,
    [id, organizationId, clientName]
  );

  return id;
}

async function upsertAutomationRuns(automationId, workflowId, executions = []) {
  for (const execution of executions) {
    const externalRunId = String(execution.id || '').trim();
    if (!externalRunId) continue;

    await query(
      `INSERT INTO automation_runs
        (id, automation_id, external_run_id, status, started_at, finished_at, duration_ms, error_message, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         started_at = VALUES(started_at),
         finished_at = VALUES(finished_at),
         duration_ms = VALUES(duration_ms),
         error_message = VALUES(error_message),
         metadata = JSON_MERGE_PATCH(COALESCE(metadata, JSON_OBJECT()), VALUES(metadata))`,
      [
        createId(),
        automationId,
        externalRunId,
        execution.status || 'unknown',
        toMysqlDateTime(execution.started_at),
        toMysqlDateTime(execution.stopped_at),
        durationMs(execution.started_at, execution.stopped_at),
        execution.error_message || execution.error || null,
        JSON.stringify({ workflow_id: workflowId })
      ]
    );

    // After updating runs, check if we need to fire alerts
    // For syncing we use the default organization ID (assume client is from same org)
    if (['error', 'failed', 'failure', 'crashed'].includes(String(execution.status || '').toLowerCase())) {
      const orgQuery = await query(`
        SELECT c.organization_id, a.client_id 
        FROM automations a
        JOIN clients c ON c.id = a.client_id
        WHERE a.id = ? 
        LIMIT 1
      `, [automationId]);
      if (orgQuery.rows[0]) {
        await processAutomationRunForAlerts({
          organizationId: orgQuery.rows[0].organization_id,
          clientId: orgQuery.rows[0].client_id,
          automationId: automationId,
          automationRunId: externalRunId,
          externalRunId: externalRunId,
          status: execution.status,
          errorMessage: execution.error_message || execution.error || 'Erro desconhecido',
          occurredAt: execution.started_at || new Date().toISOString()
        });
      }
    }
  }
}

function groupExecutionsByWorkflow(executions = []) {
  const map = new Map();
  for (const execution of executions) {
    const workflowId = String(execution.workflow_id || execution.workflowId || '');
    if (!workflowId) continue;
    if (!map.has(workflowId)) map.set(workflowId, []);
    map.get(workflowId).push(execution);
  }
  return map;
}

export async function syncN8nData() {
  const snapshot = await withTimeout(fetchN8nSnapshot(), 30000, 'Conexão com n8n expirou');
  if (!snapshot.configured) return { configured: false, synced: 0, clients: 0, runs: 0 };

  const organizationId = await getDefaultOrganizationId();
  const executionsByWorkflow = groupExecutionsByWorkflow(snapshot.executions);
  const createdOrLinkedClients = new Set();
  let syncedRuns = 0;

  for (const workflow of snapshot.workflows) {
    const workflowId = String(workflow.workflow_id);
    const executions = executionsByWorkflow.get(workflowId) || [];
    const clientId = await getOrCreateClient({
      organizationId,
      name: workflow.tag_name,
      source: 'n8n',
    });

    if (clientId) createdOrLinkedClients.add(clientId);


    const metadata = {
      tag_name: workflow.tag_name,
      workflow_id: workflowId,
      executions: executions.map((execution) => ({
        id: String(execution.id),
        status: execution.status || 'unknown',
        started_at: execution.started_at,
        stopped_at: execution.stopped_at,
      })),
    };

    const successCount = executions.filter((execution) => ['success', 'succeeded', 'ok', 'finished'].includes(String(execution.status || '').toLowerCase())).length;
    const errorCount = executions.filter((execution) => ['error', 'failed', 'failure', 'crashed'].includes(String(execution.status || '').toLowerCase())).length;
    const lastExecution = executions[0] || null;
    const lastSuccess = executions.find((execution) => ['success', 'succeeded', 'ok', 'finished'].includes(String(execution.status || '').toLowerCase())) || null;
    const lastError = executions.find((execution) => ['error', 'failed', 'failure', 'crashed'].includes(String(execution.status || '').toLowerCase())) || null;
    const errorRate = executions.length ? Number(((errorCount / executions.length) * 100).toFixed(2)) : 0;

    await query(
      `INSERT INTO automations (id, client_id, external_id, source, name, url, status, is_active, last_execution_at, last_success_at, last_error_at, error_rate, metadata)
       VALUES (?, ?, ?, 'n8n', ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE
         client_id = VALUES(client_id),
         name = VALUES(name),
         url = VALUES(url),
         status = VALUES(status),
         is_active = VALUES(is_active),
         last_execution_at = VALUES(last_execution_at),
         last_success_at = VALUES(last_success_at),
         last_error_at = VALUES(last_error_at),
         error_rate = VALUES(error_rate),
         metadata = JSON_MERGE_PATCH(COALESCE(metadata, JSON_OBJECT()), VALUES(metadata)),
         updated_at = CURRENT_TIMESTAMP`,
      [
        createId(),
        clientId,
        workflowId,
        workflow.workflow_name,
        env.n8n.baseUrl ? `${env.n8n.baseUrl.replace(/\/$/, '')}/workflow/${workflowId}` : null,
        errorCount > 0 && successCount === 0 ? 'error' : (workflow.is_active ? 'active' : 'inactive'),
        workflow.is_active ? 1 : 0,
        toMysqlDateTime(lastExecution?.started_at),
        toMysqlDateTime(lastSuccess?.started_at),
        toMysqlDateTime(lastError?.started_at),
        errorRate,
        JSON.stringify(metadata),
      ]
    );

    const saved = await query(
      `SELECT id FROM automations WHERE source = 'n8n' AND external_id = ? LIMIT 1`,
      [workflowId]
    );

    if (saved.rows[0]?.id) {
      await upsertAutomationRuns(saved.rows[0].id, workflowId, executions);
      syncedRuns += executions.length;
    }
  }

  return {
    configured: true,
    synced: snapshot.workflows.length,
    clients: createdOrLinkedClients.size,
    runs: syncedRuns,
  };
}

export async function syncTypebotData() {
  const snapshot = await withTimeout(fetchTypebotSnapshot(), 30000, 'Conexão com Typebot expirou');
  if (!snapshot.configured) return { configured: false, synced: 0, clients: 0 };

  const organizationId = await getDefaultOrganizationId();
  const createdOrLinkedClients = new Set();
  let syncedBots = 0;

  for (const bot of snapshot.bots) {
    const clientId = await getOrCreateClient({
      organizationId,
      name: bot.folder_name,
      source: 'Typebot',
    });

    if (clientId) createdOrLinkedClients.add(clientId);

    // Pastas vazias viram clientes, mas não devem criar bots sem ID.
    if (!bot.typebot_id) continue;

    await query(
      `INSERT INTO bots (id, client_id, external_id, source, name, public_id, public_url, is_published, status, metadata)
       VALUES (?, ?, ?, 'typebot', ?, ?, ?, ?, ?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE
         client_id = VALUES(client_id),
         name = VALUES(name),
         public_id = VALUES(public_id),
         public_url = VALUES(public_url),
         is_published = VALUES(is_published),
         status = VALUES(status),
         metadata = JSON_MERGE_PATCH(COALESCE(metadata, JSON_OBJECT()), VALUES(metadata)),
         updated_at = CURRENT_TIMESTAMP`,
      [
        createId(),
        clientId,
        bot.typebot_id,
        bot.typebot_name || 'Typebot sem nome',
        bot.public_id,
        bot.public_url,
        bot.is_published ? 1 : 0,
        bot.is_published ? 'active' : 'inactive',
        JSON.stringify({ folder_id: bot.folder_id, folder_name: bot.folder_name }),
      ]
    );
    syncedBots += 1;
  }

  return {
    configured: true,
    synced: syncedBots,
    clients: createdOrLinkedClients.size,
  };
}

export async function syncExternalData() {
  const [n8n, typebot] = await Promise.allSettled([
    syncN8nData(),
    syncTypebotData(),
  ]);

  return {
    n8n: n8n.status === 'fulfilled' ? n8n.value : { configured: false, error: n8n.reason?.message || 'Erro no sync n8n' },
    typebot: typebot.status === 'fulfilled' ? typebot.value : { configured: false, error: typebot.reason?.message || 'Erro no sync Typebot' },
  };
}
