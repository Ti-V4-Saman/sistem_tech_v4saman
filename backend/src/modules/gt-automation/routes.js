import { Router } from 'express';
import { asyncHandler, ok, HttpError, created } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { createId } from '../../utils/id.js';
import { query } from '../../db/pool.js';

export const gtAutomationRoutes = Router();
gtAutomationRoutes.use(authenticate);

// Mock implementation of HTTP client for Webhooks
async function callGtWebhook(type, payload) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Here we would use fetch() to send the payload to the actual n8n webhook
  // Example: return await fetch('http://n8n.local/webhook/gt-00', { method: 'POST', body: JSON.stringify(payload) })

  console.log(`[GT Automation] Mock call to ${type} with payload:`, JSON.stringify(payload, null, 2));

  if (type === 'preflight') {
    return {
      status: 'valid',
      warnings: [],
      message: 'Pré-validação concluída com sucesso. Todos os componentes podem ser instalados.'
    };
  }

  if (type === 'job') {
    return {
      job_id: `job_${createId()}`,
      status: 'running',
      message: 'Job iniciado com sucesso.'
    };
  }

  return { status: 'unknown' };
}

// Ensure the schema is strictly version 1.0
function validateContract(body) {
  if (body?.contract_version !== "1.0") {
    throw new HttpError(400, "contract_version '1.0' is required.");
  }
  return true;
}

// 1. Preflight
gtAutomationRoutes.post('/preflight', requirePermission('flows.manage'), audit('gt', 'preflight'), asyncHandler(async (req, res) => {
  validateContract(req.body);

  const payload = req.body;
  const clientId = payload.client?.id;

  if (!clientId) {
    throw new HttpError(400, "client.id is required");
  }

  // Resolve client data
  const { rows: clients } = await query(`SELECT * FROM clients WHERE id = ? AND organization_id = ?`, [clientId, req.user.organization_id]);
  if (!clients[0]) throw new HttpError(403, "Client not found or unauthorized");
  
  const clientData = clients[0];

  // Inject backend secrets/environment
  payload.request = {
    request_id: `req_${createId()}`,
    correlation_id: `corr_${createId()}`,
    actor_id: req.user.id
  };

  payload.client.tenant_id = req.user.organization_id.toString();
  payload.client.key = clientData.slug || `cli_${clientData.id}`;
  payload.client.database_name = `db_${clientData.id}`;

  payload.resolved_credentials = {
    mysql_client: { id: "mock_mysql_client", name: "GT MySQL Cliente" },
    mysql_migration: { id: "mock_mysql_migration", name: "GT MySQL Migration" },
    meta: { id: "mock_meta", name: "GT Meta" },
    google: { id: "mock_google", name: "GT Google Ads" },
  };

  payload.resolved_workflows = {
    error_handler_id: "mock_wf_error_handler"
  };

  const result = await callGtWebhook('preflight', payload);
  ok(res, result);
}));

// 2. Jobs
gtAutomationRoutes.post('/jobs', requirePermission('flows.manage'), audit('gt', 'job'), asyncHandler(async (req, res) => {
  validateContract(req.body);

  const payload = req.body;
  const clientId = payload.client?.id;

  if (!clientId) {
    throw new HttpError(400, "client.id is required");
  }

  // Resolve client data
  const { rows: clients } = await query(`SELECT * FROM clients WHERE id = ? AND organization_id = ?`, [clientId, req.user.organization_id]);
  if (!clients[0]) throw new HttpError(403, "Client not found or unauthorized");
  
  const clientData = clients[0];

  // Inject backend secrets/environment
  payload.request = {
    request_id: `req_${createId()}`,
    correlation_id: `corr_${createId()}`,
    actor_id: req.user.id
  };

  payload.client.tenant_id = req.user.organization_id.toString();
  payload.client.key = clientData.slug || `cli_${clientData.id}`;
  payload.client.database_name = `db_${clientData.id}`;

  payload.resolved_credentials = {
    mysql_client: { id: "mock_mysql_client", name: "GT MySQL Cliente" },
    mysql_migration: { id: "mock_mysql_migration", name: "GT MySQL Migration" },
    meta: { id: "mock_meta", name: "GT Meta" },
    google: { id: "mock_google", name: "GT Google Ads" },
  };

  payload.resolved_workflows = {
    error_handler_id: "mock_wf_error_handler"
  };

  const result = await callGtWebhook('job', payload);
  created(res, result);
}));

// 3. List Jobs (Mocked for now)
gtAutomationRoutes.get('/jobs', requirePermission('flows.manage'), asyncHandler(async (req, res) => {
  ok(res, {
    data: [
      { id: "job_xyz123", status: "succeeded", clientName: "Cliente Mock A" },
      { id: "job_xyz124", status: "running", clientName: "Cliente Mock B" }
    ]
  });
}));

