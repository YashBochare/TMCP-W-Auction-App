import { describe, it, expect, beforeEach } from 'vitest';
import { BidQueueManager } from '../bidQueue.js';

describe('BidQueueManager', () => {
  let queue: BidQueueManager;

  beforeEach(() => {
    queue = new BidQueueManager();
  });

  describe('addProposal', () => {
    it('creates proposal with correct fields', () => {
      const p = queue.addProposal('t1', 'Team A', 50000);
      expect(p.id).toBeTruthy();
      expect(p.teamId).toBe('t1');
      expect(p.teamName).toBe('Team A');
      expect(p.bidAmount).toBe(50000);
      expect(p.status).toBe('pending');
      expect(p.timestamp).toBeTypeOf('number');
    });

    it('generates unique IDs', () => {
      const p1 = queue.addProposal('t1', 'A', 10000);
      const p2 = queue.addProposal('t2', 'B', 20000);
      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe('getProposals', () => {
    it('returns proposals sorted by bidAmount descending', () => {
      queue.addProposal('t1', 'A', 10000);
      queue.addProposal('t2', 'B', 30000);
      queue.addProposal('t3', 'C', 20000);
      const proposals = queue.getProposals();
      expect(proposals[0].bidAmount).toBe(30000);
      expect(proposals[1].bidAmount).toBe(20000);
      expect(proposals[2].bidAmount).toBe(10000);
    });

    it('returns empty array when no proposals', () => {
      expect(queue.getProposals()).toEqual([]);
    });
  });

  describe('getProposalById', () => {
    it('returns correct proposal', () => {
      const p = queue.addProposal('t1', 'A', 10000);
      expect(queue.getProposalById(p.id)).toEqual(p);
    });

    it('returns undefined for non-existent ID', () => {
      expect(queue.getProposalById('fake')).toBeUndefined();
    });
  });

  describe('removeProposal', () => {
    it('removes specific proposal', () => {
      const p = queue.addProposal('t1', 'A', 10000);
      queue.removeProposal(p.id);
      expect(queue.getProposals()).toHaveLength(0);
    });

    it('no-op if ID does not exist', () => {
      queue.addProposal('t1', 'A', 10000);
      queue.removeProposal('fake');
      expect(queue.getProposals()).toHaveLength(1);
    });
  });

  describe('clearQueue', () => {
    it('removes all proposals', () => {
      queue.addProposal('t1', 'A', 10000);
      queue.addProposal('t2', 'B', 20000);
      queue.clearQueue();
      expect(queue.getProposals()).toHaveLength(0);
    });
  });

  describe('clearLowerProposals', () => {
    it('removes proposals at or below accepted amount', () => {
      queue.addProposal('t1', 'A', 10000);
      queue.addProposal('t2', 'B', 20000);
      queue.addProposal('t3', 'C', 30000);
      queue.clearLowerProposals(20000);
      const remaining = queue.getProposals();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].bidAmount).toBe(30000);
    });
  });

  describe('hasProposalFromTeam', () => {
    it('returns true if team has proposal', () => {
      queue.addProposal('t1', 'A', 10000);
      expect(queue.hasProposalFromTeam('t1')).toBe(true);
    });

    it('returns false if no proposal', () => {
      expect(queue.hasProposalFromTeam('t1')).toBe(false);
    });
  });

  describe('removeTeamProposal', () => {
    it('removes team proposal', () => {
      queue.addProposal('t1', 'A', 10000);
      queue.removeTeamProposal('t1');
      expect(queue.hasProposalFromTeam('t1')).toBe(false);
    });

    it('no-op for non-existent team', () => {
      queue.addProposal('t1', 'A', 10000);
      queue.removeTeamProposal('t2');
      expect(queue.getProposals()).toHaveLength(1);
    });

    it('after remove + re-add, only new proposal exists', () => {
      queue.addProposal('t1', 'A', 10000);
      queue.removeTeamProposal('t1');
      queue.addProposal('t1', 'A', 20000);
      const proposals = queue.getProposals();
      expect(proposals).toHaveLength(1);
      expect(proposals[0].bidAmount).toBe(20000);
    });
  });
});
