import type { BidProposal } from '@auction/shared';
import { randomUUID } from 'crypto';

export class BidQueueManager {
  private proposals: BidProposal[] = [];

  addProposal(teamId: string, teamName: string, bidAmount: number): BidProposal {
    const proposal: BidProposal = {
      id: randomUUID(),
      teamId,
      teamName,
      bidAmount,
      timestamp: Date.now(),
      status: 'pending',
    };
    this.proposals.push(proposal);
    return proposal;
  }

  getProposals(): BidProposal[] {
    return [...this.proposals]
      .filter((p) => p.status === 'pending')
      .sort((a, b) => b.bidAmount - a.bidAmount);
  }

  getProposalById(id: string): BidProposal | undefined {
    return this.proposals.find((p) => p.id === id);
  }

  removeProposal(id: string): void {
    this.proposals = this.proposals.filter((p) => p.id !== id);
  }

  clearQueue(): void {
    this.proposals = [];
  }

  clearLowerProposals(acceptedAmount: number): void {
    this.proposals = this.proposals.filter((p) => p.bidAmount > acceptedAmount);
  }

  hasProposalFromTeam(teamId: string): boolean {
    return this.proposals.some((p) => p.teamId === teamId && p.status === 'pending');
  }

  removeTeamProposal(teamId: string): void {
    this.proposals = this.proposals.filter((p) => p.teamId !== teamId);
  }
}

export const bidQueue = new BidQueueManager();
