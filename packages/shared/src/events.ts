import type { Player } from './types.js';

export type ClientRole = 'auctioneer' | 'captain' | 'viewer';

export interface RegisterPayload {
  role: ClientRole;
  teamId?: string;
  token?: string;
}

// Auction phases (in-memory state machine)
export type AuctionPhase = 'idle' | 'player_presented' | 'bidding_open' | 'bidding_closed';

export interface AuctionStatePayload {
  phase: AuctionPhase;
  currentPlayer: Player | null;
  currentHighestBid: number;
  currentHighestBidderTeamId: string | null;
  timerSeconds: number;
  isPaused: boolean;
}

// Kept for backward compat with Story 1.4 stateSync — now uses AuctionStatePayload
export type AuctionStateSyncPayload = AuctionStatePayload;

export interface SellPayload {
  teamId: string;
}

export interface ServerToClientEvents {
  'server:welcome': (data: { serverTime: number }) => void;
  'server:registered': (data: { success: boolean; role?: ClientRole; socketId: string; error?: string }) => void;
  'server:pong': (data: { serverTime: number; clientTime: number }) => void;
  'server:stateSync': (data: AuctionStateSyncPayload) => void;
  'auction:stateChanged': (data: AuctionStatePayload) => void;
  'auction:playerPresented': (data: { player: Player }) => void;
  'auction:sold': (data: { playerName: string; teamName: string; soldPrice: number }) => void;
  'auction:unsold': (data: { playerName: string }) => void;
  'auction:error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'client:register': (data: RegisterPayload) => void;
  'client:ping': (data: { clientTime: number }) => void;
  'client:requestState': () => void;
  'auction:nextPlayer': () => void;
  'auction:openBidding': () => void;
  'auction:closeBidding': () => void;
  'auction:sell': (data: SellPayload) => void;
  'auction:markUnsold': () => void;
}
