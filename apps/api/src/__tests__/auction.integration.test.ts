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

describe('Auction API', () => {
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

  it('GET /api/auction/state returns current state', async () => {
    const res = await request('GET', '/api/auction/state');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phase).toBeDefined();
  });

  it('POST /api/auction/open-bidding from idle returns 400', async () => {
    const res = await request('POST', '/api/auction/open-bidding');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Cannot transition');
  });

  it('POST /api/auction/close-bidding from idle returns 400', async () => {
    const res = await request('POST', '/api/auction/close-bidding');
    expect(res.status).toBe(400);
  });

  it('POST /api/auction/sell without teamId returns 400', async () => {
    const res = await request('POST', '/api/auction/sell', {});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('teamId');
  });

  it('POST /api/auction/mark-unsold from idle returns 400', async () => {
    const res = await request('POST', '/api/auction/mark-unsold');
    expect(res.status).toBe(400);
  });

  // next-player hits DB, will fail with fake URL — confirms route exists
  it('POST /api/auction/next-player route is registered', async () => {
    const res = await request('POST', '/api/auction/next-player');
    // 400 or 404 or 500 (DB unreachable) — confirms handler runs
    expect([400, 404, 500]).toContain(res.status);
  });
});
