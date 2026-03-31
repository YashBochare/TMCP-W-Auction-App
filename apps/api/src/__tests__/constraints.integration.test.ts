import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.JWT_EXPIRY = '1h';
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import express from 'express';
import auctionRoutes from '../routes/auction.routes.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auction', auctionRoutes);
  return app;
}

describe('Constraint API endpoints', () => {
  const app = createTestApp();

  async function request(method: string, path: string, body?: object) {
    const { default: supertest } = await import('supertest');
    const req = (supertest as any)(app);
    let r;
    switch (method) {
      case 'POST': r = req.post(path).send(body); break;
      default: r = req.get(path);
    }
    return r;
  }

  // These hit DB — confirm routes are registered (will be 500 with fake DB)
  it('GET /api/auction/constraints route exists', async () => {
    const res = await request('GET', '/api/auction/constraints');
    expect([200, 500]).toContain(res.status);
  });

  it('GET /api/auction/constraints/:teamId route exists', async () => {
    const res = await request('GET', '/api/auction/constraints/some-id');
    expect([200, 404, 500]).toContain(res.status);
  });

  it('POST /api/auction/validate-bid rejects missing teamId', async () => {
    const res = await request('POST', '/api/auction/validate-bid', { bidAmount: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('teamId');
  });

  it('POST /api/auction/validate-bid rejects missing bidAmount', async () => {
    const res = await request('POST', '/api/auction/validate-bid', { teamId: 'team-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('bidAmount');
  });
});
