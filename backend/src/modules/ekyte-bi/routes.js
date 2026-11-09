import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { createBiRouter, triggerSync, getIsSyncRunning, getLastSyncError } = require('../../../../api-ekyte/src/routes.js');

export const ekyteBiRoutes = createBiRouter({ serveStatic: false });
export { triggerSync, getIsSyncRunning, getLastSyncError };

