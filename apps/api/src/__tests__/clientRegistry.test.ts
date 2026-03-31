import { describe, it, expect, beforeEach } from 'vitest';
import {
  addClient,
  removeClient,
  getClient,
  getClientsByRole,
  getAllClients,
  getClientCount,
  clearAll,
} from '../socket/clientRegistry.js';

describe('clientRegistry', () => {
  beforeEach(() => {
    clearAll();
  });

  describe('addClient', () => {
    it('adds a client and returns it', () => {
      const client = addClient('socket-1', 'viewer');
      expect(client.socketId).toBe('socket-1');
      expect(client.role).toBe('viewer');
      expect(client.connectedAt).toBeInstanceOf(Date);
    });

    it('adds a captain with teamId', () => {
      const client = addClient('socket-2', 'captain', 'team-abc');
      expect(client.teamId).toBe('team-abc');
    });

    it('overwrites on duplicate socketId', () => {
      addClient('socket-1', 'viewer');
      addClient('socket-1', 'captain', 'team-xyz');
      expect(getClientCount()).toBe(1);
      expect(getClient('socket-1')?.role).toBe('captain');
    });
  });

  describe('removeClient', () => {
    it('removes an existing client', () => {
      addClient('socket-1', 'viewer');
      expect(removeClient('socket-1')).toBe(true);
      expect(getClientCount()).toBe(0);
    });

    it('returns false for non-existent client', () => {
      expect(removeClient('nonexistent')).toBe(false);
    });
  });

  describe('getClientsByRole', () => {
    it('filters by role', () => {
      addClient('s1', 'viewer');
      addClient('s2', 'captain', 't1');
      addClient('s3', 'viewer');
      addClient('s4', 'auctioneer');

      expect(getClientsByRole('viewer')).toHaveLength(2);
      expect(getClientsByRole('captain')).toHaveLength(1);
      expect(getClientsByRole('auctioneer')).toHaveLength(1);
    });

    it('returns empty array for no matches', () => {
      addClient('s1', 'viewer');
      expect(getClientsByRole('auctioneer')).toHaveLength(0);
    });
  });

  describe('getAllClients', () => {
    it('returns all clients', () => {
      addClient('s1', 'viewer');
      addClient('s2', 'captain', 't1');
      expect(getAllClients()).toHaveLength(2);
    });

    it('returns empty array when no clients', () => {
      expect(getAllClients()).toHaveLength(0);
    });
  });
});
