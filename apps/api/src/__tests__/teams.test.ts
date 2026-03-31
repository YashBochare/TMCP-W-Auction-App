import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.JWT_EXPIRY = '1h';
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import express from 'express';
import teamsRoutes from '../routes/teams.routes.js';
import { generateToken } from '../services/auth.service.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/teams', teamsRoutes);
  return app;
}

describe('Teams API', () => {
  const app = createTestApp();
  let token: string;

  beforeAll(() => {
    token = generateToken({ role: 'auctioneer' });
  });

  async function request(method: string, path: string, body?: object) {
    const { default: supertest } = await import('supertest');
    const req = (supertest as any)(app);
    let r;
    switch (method) {
      case 'POST': r = req.post(path).send(body); break;
      case 'PUT': r = req.put(path).send(body); break;
      case 'DELETE': r = req.delete(path); break;
      default: r = req.get(path);
    }
    r.set('Authorization', `Bearer ${token}`);
    return r;
  }

  it('returns 401 without auth', async () => {
    const { default: supertest } = await import('supertest');
    const res = await (supertest as any)(app).get('/api/teams');
    expect(res.status).toBe(401);
  });

  it('rejects team with invalid color', async () => {
    const res = await request('POST', '/api/teams', {
      name: 'Test', accessCode: 'ABC', colorCode: 'pink',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details.some((d: string) => d.includes('colorCode'))).toBe(true);
  });

  it('rejects team with missing name', async () => {
    const res = await request('POST', '/api/teams', {
      accessCode: 'XYZ', colorCode: 'slate',
    });
    expect(res.status).toBe(422);
  });

  it('rejects batch with duplicate names', async () => {
    const res = await request('POST', '/api/teams/batch', {
      teams: [
        { name: 'Same', accessCode: 'A1', colorCode: 'slate' },
        { name: 'Same', accessCode: 'A2', colorCode: 'gold' },
      ],
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toContain('Duplicate team names in batch');
  });

  it('rejects batch with duplicate access codes', async () => {
    const res = await request('POST', '/api/teams/batch', {
      teams: [
        { name: 'Team A', accessCode: 'SAME', colorCode: 'slate' },
        { name: 'Team B', accessCode: 'SAME', colorCode: 'gold' },
      ],
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toContain('Duplicate access codes in batch');
  });

  it('rejects non-auctioneer role', async () => {
    const captainToken = generateToken({ role: 'captain', teamId: 't1', teamName: 'T' });
    const { default: supertest } = await import('supertest');
    const res = await (supertest as any)(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${captainToken}`);
    expect(res.status).toBe(403);
  });
});
