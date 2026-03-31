import { describe, it, expect, beforeAll } from 'vitest';

// Set env vars before importing app
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.JWT_EXPIRY = '1h';
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import express from 'express';
import authRoutes from '../routes/auth.routes.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  // Protected test endpoint
  app.get('/api/test/protected', requireAuth, requireRole('auctioneer' as any), (_req, res) => {
    res.json({ message: 'authorized' });
  });

  // Public test endpoint
  app.get('/api/test/public', (_req, res) => {
    res.json({ message: 'public' });
  });

  return app;
}

describe('Auth integration', () => {
  const app = createTestApp();

  async function request(method: string, path: string, body?: object, headers?: Record<string, string>) {
    const { default: supertest } = await import('supertest');
    const req = (supertest as any)(app);
    const r = method === 'POST' ? req.post(path).send(body) : req.get(path);
    if (headers) {
      for (const [k, v] of Object.entries(headers)) r.set(k, v);
    }
    return r;
  }

  describe('POST /api/auth/admin', () => {
    it('returns 401 for wrong password', async () => {
      const res = await request('POST', '/api/auth/admin', { accessCode: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid access code');
    });

    it('returns JWT for correct password', async () => {
      const res = await request('POST', '/api/auth/admin', { accessCode: 'test-admin-pass' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.role).toBe('auctioneer');
    });

    it('returns 400 for missing accessCode', async () => {
      const res = await request('POST', '/api/auth/admin', {});
      expect(res.status).toBe(400);
    });
  });

  describe('Protected route access', () => {
    it('returns 401 without token', async () => {
      const res = await request('GET', '/api/test/protected');
      expect(res.status).toBe(401);
    });

    it('returns 200 with valid auctioneer token', async () => {
      const loginRes = await request('POST', '/api/auth/admin', { accessCode: 'test-admin-pass' });
      const token = loginRes.body.token;

      const res = await request('GET', '/api/test/protected', undefined, {
        Authorization: `Bearer ${token}`,
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('authorized');
    });
  });

  describe('Public route', () => {
    it('accessible without auth', async () => {
      const res = await request('GET', '/api/test/public');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('public');
    });
  });
});
