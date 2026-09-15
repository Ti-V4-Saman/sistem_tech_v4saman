import { Router } from 'express';
import { AdsService } from './ads.service.js';
import { asyncHandler, ok, HttpError } from '../../utils/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const adsDashboardRoutes = Router();
adsDashboardRoutes.use(authenticate);

const service = new AdsService();

function parseDateParams(req) {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    throw new HttpError(400, 'startDate and endDate are required');
  }
  return { startDate, endDate };
}

adsDashboardRoutes.get('/clients', requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
  const clients = await service.getClients(req.user.organization_id);
  ok(res, { clients });
}));

adsDashboardRoutes.get('/overview', requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) throw new HttpError(400, 'clientId is required');
  const { startDate, endDate } = parseDateParams(req);
  const data = await service.getOverview(clientId, req.user.organization_id, startDate, endDate);
  ok(res, data);
}));

adsDashboardRoutes.get('/daily', requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
  const { clientId, platform } = req.query;
  if (!clientId || !platform) throw new HttpError(400, 'clientId and platform are required');
  if (!['meta', 'google'].includes(platform)) throw new HttpError(400, 'invalid platform');
  const { startDate, endDate } = parseDateParams(req);
  const data = await service.getDailyData(clientId, req.user.organization_id, platform, startDate, endDate);
  ok(res, { data });
}));

adsDashboardRoutes.get('/campaigns', requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
  const { clientId, platform } = req.query;
  if (!clientId || !platform) throw new HttpError(400, 'clientId and platform are required');
  if (!['meta', 'google'].includes(platform)) throw new HttpError(400, 'invalid platform');
  const { startDate, endDate } = parseDateParams(req);
  const data = await service.getCampaigns(clientId, req.user.organization_id, platform, startDate, endDate);
  ok(res, { data });
}));

// --- Data Maintenance (GT 50-53) ---

adsDashboardRoutes.post('/maintenance/preview', requirePermission('dashboard.manage'), asyncHandler(async (req, res) => {
  const { clientId, platform, operation, startDate, endDate } = req.body;
  if (!clientId || !platform || !operation) throw new HttpError(400, 'clientId, platform and operation are required');
  
  // Mock preview response
  ok(res, {
    impact: {
      rowsAffected: 1450,
      estimatedTime: '45s',
      warning: operation === 'delete' ? 'This operation is destructive and will remove data locally.' : null
    }
  });
}));

adsDashboardRoutes.post('/maintenance/jobs', requirePermission('dashboard.manage'), asyncHandler(async (req, res) => {
  const { clientId, platform, operation, startDate, endDate, reason } = req.body;
  if (!reason) throw new HttpError(400, 'Reason is required for maintenance operations.');
  
  // Return mock job
  ok(res, {
    jobId: `maint_${Date.now()}`,
    status: 'running',
    message: `Maintenance operation ${operation} started.`
  });
}));

adsDashboardRoutes.get('/maintenance/jobs/:jobId', requirePermission('dashboard.manage'), asyncHandler(async (req, res) => {
  ok(res, {
    jobId: req.params.jobId,
    status: 'succeeded',
    message: 'Operation completed successfully.'
  });
}));

adsDashboardRoutes.post('/maintenance/jobs/:jobId/restore', requirePermission('dashboard.manage'), asyncHandler(async (req, res) => {
  ok(res, {
    jobId: req.params.jobId,
    status: 'running',
    message: 'Restoring snapshot...'
  });
}));

