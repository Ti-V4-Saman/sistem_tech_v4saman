import express from 'express';
import cors from 'cors';
import { env } from '../config/env.js';
import { securityHeaders, rateLimit } from '../middleware/security.js';
import { errorHandler, notFound } from '../middleware/errors.js';
import { authRoutes } from '../modules/auth/routes.js';
import { dashboardRoutes } from '../modules/dashboard/routes.js';
import { clientRoutes } from '../modules/clients/routes.js';
import { userRoutes } from '../modules/users/routes.js';
import { credentialRoutes } from '../modules/credentials/routes.js';
import { automationRoutes } from '../modules/automations/routes.js';
import { docRoutes } from '../modules/docs/routes.js';
import { ticketRoutes } from '../modules/tickets/routes.js';
import { incidentRoutes } from '../modules/incidents/routes.js';
import { instanceRoutes } from '../modules/instances/routes.js';
import { settingsRoutes } from '../modules/settings/routes.js';
import { notificationRoutes } from '../modules/notifications/routes.js';
import { telephonyRoutes } from '../modules/telephony/routes.js';
import { flowTemplateRoutes } from '../modules/flow-templates/routes.js';
import { alertRoutes } from '../modules/alerts/routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit());

  app.get('/api/healthcheck', (req, res) => {
    res.json({ ok: true, env: env.appEnv, timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/credentials', credentialRoutes);
  app.use('/api/automations', automationRoutes);
  app.use('/api/docs', docRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/incidents', incidentRoutes);
  app.use('/api/instances', instanceRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/telephony', telephonyRoutes);
  app.use('/api/flow-templates', flowTemplateRoutes);
  app.use('/api/alerts', alertRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
