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

// Undo snapshot types (Story 5.2)
export type UndoSnapshot =
  | { type: 'SOLD'; playerId: string; teamId: string; amount: number; previousPhase: AuctionPhase; previousBid: number; previousTeamId: string | null }
  | { type: 'UNSOLD'; playerId: string; previousPhase: AuctionPhase; previousBid: number; previousTeamId: string | null }
  | { type: 'BID_ACCEPTED'; previousBid: number; previousTeamId: string | null }
  | null;

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
  lastAcceptedBid: { teamId: string; bidAmount: number; previousHighestBid: number; previousHighestBidderTeamId: string | null } | null = null;
  isPaused = false;
  private lastAction: UndoSnapshot = null;

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
    this.isPaused = false;
    this.lastAction = null;

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
      this.isPaused = false;
      await this.syncToDb();
    });
  }

  async acceptBid(teamId: string, bidAmount: number): Promise<void> {
    return mutex.runExclusive(async () => {
      if (this.phase !== 'bidding_open' && this.phase !== 'bidding_closed') {
        throw new Error(`Cannot accept bid: auction is in ${this.phase} phase`);
      }
      if (!this.currentPlayer) {
        throw new Error('Cannot accept bid: no current player');
      }
      if (bidAmount <= this.currentHighestBid) {
        throw new Error(`Bid of ${bidAmount} must exceed current highest bid of ${this.currentHighestBid}`);
      }

      this.lastAcceptedBid = {
        teamId,
        bidAmount,
        previousHighestBid: this.currentHighestBid,
        previousHighestBidderTeamId: this.currentHighestBidderTeamId,
      };

      this.lastAction = { type: 'BID_ACCEPTED', previousBid: this.currentHighestBid, previousTeamId: this.currentHighestBidderTeamId };

      this.currentHighestBid = bidAmount;
      this.currentHighestBidderTeamId = teamId;
      await this.syncToDb();
    });
  }

  async pause(): Promise<void> {
    return mutex.runExclusive(async () => {
      if (this.phase !== 'bidding_open') {
        throw new Error('Cannot pause: bidding is not open');
      }
      if (this.isPaused) {
        throw new Error('Auction is already paused');
      }
      this.isPaused = true;
      await this.syncToDb();
    });
  }

  async resume(): Promise<void> {
    return mutex.runExclusive(async () => {
      if (!this.isPaused) {
        throw new Error('Auction is not paused');
      }
      this.isPaused = false;
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

    // Snapshot BEFORE mutation for undo
    this.lastAction = {
      type: 'SOLD',
      playerId: this.currentPlayer.id,
      teamId,
      amount: this.currentHighestBid,
      previousPhase: this.phase,
      previousBid: this.currentHighestBid,
      previousTeamId: this.currentHighestBidderTeamId,
    };

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
    this.isPaused = false;

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

    // Snapshot BEFORE mutation for undo
    this.lastAction = {
      type: 'UNSOLD',
      playerId: this.currentPlayer.id,
      previousPhase: this.phase,
      previousBid: this.currentHighestBid,
      previousTeamId: this.currentHighestBidderTeamId,
    };

    const playerName = this.currentPlayer.name;

    await getPrisma().player.update({
      where: { id: this.currentPlayer.id },
      data: { status: 'UNSOLD' },
    });

    this.currentPlayer = null;
    this.currentHighestBid = 0;
    this.currentHighestBidderTeamId = null;
    this.phase = 'idle';
    this.isPaused = false;

    await this.syncToDb();
    return { playerName };
  }

  // Story 5.2: Undo last action
  async undo(): Promise<{ undoneType: string }> {
    return mutex.runExclusive(async () => this._undo());
  }

  private async _undo(): Promise<{ undoneType: string }> {
    if (!this.lastAction) throw new Error('No recent action to undo');

    const action = this.lastAction;

    if (action.type === 'SOLD') {
      await getPrisma().$transaction(async (tx) => {
        await tx.player.update({
          where: { id: action.playerId },
          data: { status: 'PENDING', teamId: null, soldPrice: null },
        });
        await tx.team.update({
          where: { id: action.teamId },
          data: { purse: { increment: action.amount } },
        });
      });

      const player = await getPrisma().player.findUnique({ where: { id: action.playerId } });
      if (!player) throw new Error('Undo failed: player no longer exists');
      this.currentPlayer = player;
      this.currentHighestBid = action.previousBid;
      this.currentHighestBidderTeamId = action.previousTeamId;
      this.phase = action.previousPhase;
      await this.syncToDb();
    } else if (action.type === 'UNSOLD') {
      await getPrisma().player.update({
        where: { id: action.playerId },
        data: { status: 'PENDING' },
      });

      const player = await getPrisma().player.findUnique({ where: { id: action.playerId } });
      if (!player) throw new Error('Undo failed: player no longer exists');
      this.currentPlayer = player;
      this.currentHighestBid = action.previousBid;
      this.currentHighestBidderTeamId = action.previousTeamId;
      this.phase = action.previousPhase;
      await this.syncToDb();
    } else if (action.type === 'BID_ACCEPTED') {
      this.currentHighestBid = action.previousBid;
      this.currentHighestBidderTeamId = action.previousTeamId;
      await this.syncToDb();
    }

    const undoneType = action.type;
    this.lastAction = null;
    return { undoneType };
  }

  getState(timerOverrides?: { timerSeconds: number; timerRunning: boolean }): AuctionStatePayload {
    return {
      phase: this.phase,
      currentPlayer: this.currentPlayer as any,
      currentHighestBid: this.currentHighestBid,
      currentHighestBidderTeamId: this.currentHighestBidderTeamId,
      timerSeconds: timerOverrides?.timerSeconds ?? this.timerSeconds,
      timerRunning: timerOverrides?.timerRunning ?? false,
      isPaused: this.isPaused,
      hasUndoHistory: this.lastAction !== null,
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
