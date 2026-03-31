import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Set env vars before importing auth modules
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.JWT_EXPIRY = '1h';
});

import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { generateToken } from '../services/auth.service.js';

function mockReqResNext(overrides: Partial<Request> = {}) {
  const req = { headers: {}, ...overrides } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('requireAuth middleware', () => {
  it('returns 401 when no Authorization header', () => {
    const { req, res, next } = mockReqResNext();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Bearer invalid-token' } as any,
    });
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.user for valid token', () => {
    const token = generateToken({ role: 'auctioneer' as const });
    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` } as any,
    });
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.role).toBe('auctioneer');
  });
});

describe('requireRole middleware', () => {
  it('returns 403 when role does not match', () => {
    const { req, res, next } = mockReqResNext();
    req.user = { role: 'captain' as const, teamId: 't1', teamName: 'T' };
    const middleware = requireRole('auctioneer' as any);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when role matches', () => {
    const { req, res, next } = mockReqResNext();
    req.user = { role: 'auctioneer' as const };
    const middleware = requireRole('auctioneer' as any);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when req.user is undefined', () => {
    const { req, res, next } = mockReqResNext();
    const middleware = requireRole('auctioneer' as any);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
