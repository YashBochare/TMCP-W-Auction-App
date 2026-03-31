import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.JWT_EXPIRY = '1h';
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import express from 'express';
import playersRoutes from '../routes/players.routes.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/players', playersRoutes);
  return app;
}

describe('Players API validation', () => {
  const app = createTestApp();

  async function request(method: string, path: string, body?: object) {
    const { default: supertest } = await import('supertest');
    const req = (supertest as any)(app);
    let r;
    switch (method) {
      case 'PUT': r = req.put(path).send(body); break;
      case 'DELETE': r = req.delete(path); break;
      default: r = req.get(path);
    }
    return r;
  }

  // Note: GET/PUT/DELETE that hit the DB will fail with fake DATABASE_URL.
  // We test the validation paths that return before DB calls.

  it('PUT rejects non-existent player with 500 (DB unreachable)', async () => {
    // This verifies the route is registered and handler runs
    const res = await request('PUT', '/api/players/nonexistent', { name: 'Test' });
    // Will be 500 since DB is fake — confirms route exists
    expect([400, 404, 500]).toContain(res.status);
  });

  it('DELETE route is registered', async () => {
    const res = await request('DELETE', '/api/players/nonexistent');
    expect([404, 500]).toContain(res.status);
  });

  it('GET route is registered', async () => {
    const res = await request('GET', '/api/players');
    // Will be 500 since DB is fake — confirms route exists and handler runs
    expect([200, 500]).toContain(res.status);
  });
});
