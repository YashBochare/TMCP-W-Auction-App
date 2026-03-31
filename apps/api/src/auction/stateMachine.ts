import type { AuctionPhase, AuctionStatePayload } from '@auction/shared';
import { Mutex } from 'async-mutex';
import { getPrisma } from '../lib/prisma.js';

// Prevents interleaving of concurrent async state mutations
const mutex = new Mutex();

// Phase transition map
const VALID_TRANSITIONS: Record<AuctionPhase, AuctionPhase[]> = {
  idle: ['player_presented'],
  player_presented: ['bidding_open', 'idle'],
  bidding_open: ['bidding_closed', 'idle'],
  bidding_closed: ['idle', 'player_presented'],
};

// Map in-memory phase to DB BiddingStatus
function phaseToBiddingStatus(phase: AuctionPhase): 'IDLE' | 'OPEN' | 'CLOSED' {
  switch (phase) {
    case 'idle':
    case 'player_presented':
      return 'IDLE';
    case 'bidding_open':
      return 'OPEN';
    case 'bidding_closed':
      return 'CLOSED';
  }
}

interface PlayerRecord {
  id: string;
  name: string;
  photoUrl: string | null;
  role: string;
  clubLevel: string;
  speakingSkill: string;
  funTitle: string;
  basePrice: number;
  status: string;
  soldPrice: number | null;
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AuctionStateMachine {
  phase: AuctionPhase = 'idle';
  currentPlayer: PlayerRecord | null = null;
  currentHighestBid = 0;
  currentHighestBidderTeamId: string | null = null;
  timerSeconds = 20;
  isPaused = false;

  private validateTransition(target: AuctionPhase): void {
    if (!VALID_TRANSITIONS[this.phase].includes(target)) {
      const actions: Record<string, string> = {
        player_presented: 'present a player first (nextPlayer)',
        bidding_open: 'open bidding first',
        bidding_closed: 'close bidding first',
        idle: 'complete or skip the current player',
      };
      throw new Error(
        `Cannot transition from '${this.phase}' to '${target}' — ${actions[target] || 'invalid transition'}`
      );
    }
  }

  async nextPlayer(): Promise<PlayerRecord> {
    return mutex.runExclusive(async () => this._nextPlayer());
  }

  private async _nextPlayer(): Promise<PlayerRecord> {
    this.validateTransition('player_presented');

    const player = await getPrisma().player.findFirst({
      where: { status: 'PENDING' },
      orderBy: [{ basePrice: 'desc' }, { name: 'asc' }],
    });

    if (!player) throw new Error('No pending players remaining');

    this.currentPlayer = player;
    this.currentHighestBid = 0;
    this.currentHighestBidderTeamId = null;
    this.phase = 'player_presented';
    this.timerSeconds = 20;

    await this.syncToDb();
    return player;
  }

  async openBidding(): Promise<void> {
    return mutex.runExclusive(async () => {
      this.validateTransition('bidding_open');
      this.phase = 'bidding_open';
      this.timerSeconds = 20;
      await this.syncToDb();
    });
  }

  async closeBidding(): Promise<void> {
    return mutex.runExclusive(async () => {
      this.validateTransition('bidding_closed');
      this.phase = 'bidding_closed';
      await this.syncToDb();
    });
  }

  async sell(teamId: string): Promise<{ playerName: string; teamName: string; soldPrice: number }> {
    return mutex.runExclusive(async () => this._sell(teamId));
  }

  private async _sell(teamId: string): Promise<{ playerName: string; teamName: string; soldPrice: number }> {
    if (this.phase !== 'bidding_closed' && this.phase !== 'bidding_open') {
      throw new Error('Cannot sell: bidding must be open or closed');
    }
    if (!this.currentPlayer) throw new Error('Cannot sell: no current player');
    if (this.currentHighestBid <= 0) throw new Error('Cannot sell: no accepted bid');

    const playerName = this.currentPlayer.name;
    const soldPrice = this.currentHighestBid;
    const playerId = this.currentPlayer.id;

    // Atomic transaction: verify purse, update player, deduct purse
    const result = await getPrisma().$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team) throw new Error(`Team ${teamId} not found`);
      if (team.purse < soldPrice) {
        throw new Error(`Team purse (${team.purse}) insufficient for bid (${soldPrice})`);
      }
      await tx.player.update({
        where: { id: playerId },
        data: { status: 'SOLD', soldPrice, teamId },
      });
      await tx.team.update({
        where: { id: teamId },
        data: { purse: { decrement: soldPrice } },
      });
      return { teamName: team.name };
    });

    this.currentPlayer = null;
    this.currentHighestBid = 0;
    this.currentHighestBidderTeamId = null;
    this.phase = 'idle';

    await this.syncToDb();
    return { playerName, teamName: result.teamName, soldPrice };
  }

  async markUnsold(): Promise<{ playerName: string }> {
    return mutex.runExclusive(async () => this._markUnsold());
  }

  private async _markUnsold(): Promise<{ playerName: string }> {
    if (!this.currentPlayer) throw new Error('Cannot mark unsold: no current player');
    if (this.phase !== 'bidding_closed' && this.phase !== 'player_presented') {
      throw new Error('Cannot mark unsold: bidding must be closed or player just presented');
    }

    const playerName = this.currentPlayer.name;

    await getPrisma().player.update({
      where: { id: this.currentPlayer.id },
      data: { status: 'UNSOLD' },
    });

    this.currentPlayer = null;
    this.currentHighestBid = 0;
    this.currentHighestBidderTeamId = null;
    this.phase = 'idle';

    await this.syncToDb();
    return { playerName };
  }

  getState(): AuctionStatePayload {
    return {
      phase: this.phase,
      currentPlayer: this.currentPlayer as any,
      currentHighestBid: this.currentHighestBid,
      currentHighestBidderTeamId: this.currentHighestBidderTeamId,
      timerSeconds: this.timerSeconds,
      isPaused: this.isPaused,
    };
  }

  async syncToDb(): Promise<void> {
    const state = await getPrisma().auctionState.findFirst();
    const data = {
      currentPlayerId: this.currentPlayer?.id ?? null,
      currentHighestBid: this.currentHighestBid,
      currentHighestBidderId: this.currentHighestBidderTeamId,
      biddingStatus: phaseToBiddingStatus(this.phase),
      timerSeconds: this.timerSeconds,
      isPaused: this.isPaused,
    };

    if (state) {
      await getPrisma().auctionState.update({ where: { id: state.id }, data });
    } else {
      await getPrisma().auctionState.create({ data });
    }
  }

  async loadFromDb(): Promise<void> {
    const state = await getPrisma().auctionState.findFirst();
    if (!state) return;

    try {
      this.currentHighestBid = state.currentHighestBid;
      this.currentHighestBidderTeamId = state.currentHighestBidderId;
      this.timerSeconds = state.timerSeconds;
      this.isPaused = state.isPaused;

      // Restore player if one was active
      if (state.currentPlayerId) {
        const player = await getPrisma().player.findUnique({ where: { id: state.currentPlayerId } });
        this.currentPlayer = player;
      } else {
        this.currentPlayer = null;
      }

      // Map DB biddingStatus back to in-memory phase
      switch (state.biddingStatus) {
        case 'OPEN':
          this.phase = 'bidding_open';
          break;
        case 'CLOSED':
          this.phase = 'bidding_closed';
          break;
        case 'IDLE':
          this.phase = this.currentPlayer ? 'player_presented' : 'idle';
          break;
      }
    } catch (err) {
      // Reset to safe defaults on partial load failure
      this.phase = 'idle';
      this.currentPlayer = null;
      this.currentHighestBid = 0;
      this.currentHighestBidderTeamId = null;
      this.timerSeconds = 20;
      this.isPaused = false;
      throw err;
    }
  }
}

export const stateMachine = new AuctionStateMachine();
