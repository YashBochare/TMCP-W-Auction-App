import { describe, it, expect, beforeAll } from 'vitest';

// Set env vars before importing auth modules
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.JWT_EXPIRY = '1h';
});

import {
  validateAuctioneerPassword,
  generateToken,
  verifyToken,
} from '../services/auth.service.js';

describe('auth.service', () => {
  describe('validateAuctioneerPassword', () => {
    it('returns true for correct password', () => {
      expect(validateAuctioneerPassword('test-admin-pass')).toBe(true);
    });

    it('returns false for incorrect password', () => {
      expect(validateAuctioneerPassword('wrong')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(validateAuctioneerPassword('')).toBe(false);
    });
  });

  describe('generateToken + verifyToken', () => {
    it('generates a valid JWT that can be verified', () => {
      const payload = { role: 'auctioneer' as const };
      const token = generateToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.role).toBe('auctioneer');
    });

    it('includes teamId and teamName for captain tokens', () => {
      const payload = {
        role: 'captain' as const,
        teamId: 'team-123',
        teamName: 'Thunder',
      };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      expect(decoded!.role).toBe('captain');
      expect(decoded!.teamId).toBe('team-123');
      expect(decoded!.teamName).toBe('Thunder');
    });

    it('returns null for invalid token', () => {
      expect(verifyToken('invalid-token')).toBeNull();
    });

    it('returns null for tampered token', () => {
      const token = generateToken({ role: 'auctioneer' as const });
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(verifyToken(tampered)).toBeNull();
    });
  });
});
