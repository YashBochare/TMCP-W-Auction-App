// Shared TypeScript interfaces mirroring the DB models.
// Frontend and shared code use these; the backend uses Prisma-generated types directly.

export type PlayerStatus = 'PENDING' | 'SOLD' | 'UNSOLD';

export type BiddingStatus = 'IDLE' | 'OPEN' | 'CLOSED';

export interface Team {
  id: string;
  name: string;
  colorCode: string;
  purse: number;
  accessCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  name: string;
  photoUrl?: string;
  role: string;
  clubLevel: string;
  speakingSkill: string;
  funTitle: string;
  basePrice: number;
  status: PlayerStatus;
  soldPrice?: number;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuctionState {
  id: string;
  currentPlayerId?: string;
  currentHighestBid: number;
  currentHighestBidderId?: string;
  biddingStatus: BiddingStatus;
  timerSeconds: number;
  isPaused: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Player Upload types (Story 2.2)

export interface PlayerUploadRow {
  name: string;
  role: string;
  clubLevel: string;
  speakingSkill: string;
  funTitle: string;
  basePrice: number;
}

export interface UploadValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface PlayerUploadResponse {
  success: boolean;
  playersCreated: number;
  errors: UploadValidationError[];
}

// Player Roster types (Story 2.3)

export interface UpdatePlayerRequest {
  name?: string;
  role?: string;
  clubLevel?: string;
  speakingSkill?: string;
  funTitle?: string;
  basePrice?: number;
}
