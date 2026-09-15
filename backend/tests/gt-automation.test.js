import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/http/app.js';

// Mocks
vi.mock('../src/middleware/auth.js', () => ({
  authenticate: (req, res, next) => {
    // Mock user
    req.user = { id: 1, organization_id: 1, role: 'admin' };
    next();
  },
  requirePermission: (perm) => (req, res, next) => {
    // allow all in this mock except when testing 403
    if (req.headers['x-test-role'] === 'user' && perm === 'flows.manage') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  }
}));

describe('GT Automation Administrative APIs', () => {
  const app = createApp();

  it('should return 403 for non-admins accessing GT automation', async () => {
    const res = await request(app)
      .post('/api/admin/gt-automation/preflight')
      .set('x-test-role', 'user')
      .send({});
    
    expect(res.status).toBe(403);
  });

  it('should validate contract_version 1.0', async () => {
    const res = await request(app)
      .post('/api/admin/gt-automation/preflight')
      .set('x-test-role', 'admin')
      .send({ contract_version: "0.9" });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("contract_version '1.0' is required");
  });

  it('should require client.id', async () => {
    const res = await request(app)
      .post('/api/admin/gt-automation/preflight')
      .set('x-test-role', 'admin')
      .send({ contract_version: "1.0", client: {} });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("client.id is required");
  });
});
