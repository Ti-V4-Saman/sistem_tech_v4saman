import { createRequire } from 'module';
import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.js';

const require = createRequire(import.meta.url);
const { createBiRouter, triggerSync, getIsSyncRunning, getLastSyncError } = require('../../../../api-ekyte/src/routes.js');

const rawBiRouter = createBiRouter({ serveStatic: false });

export const ekyteBiRoutes = Router();
ekyteBiRoutes.use('/api/bi', authenticate, requireAdmin);
ekyteBiRoutes.use(rawBiRouter);

export { triggerSync, getIsSyncRunning, getLastSyncError };

