export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type {
  PlayerStatus,
  BiddingStatus,
  Team,
  Player,
  AuctionState,
  PlayerUploadRow,
  UploadValidationError,
  PlayerUploadResponse,
  UpdatePlayerRequest,
  TeamBidConstraints,
  BidValidationResult,
  AuctionConfig,
} from './types.js';
export { calculateMaxBid, canTeamBid, validateBid } from './constraintEngine.js';
export { getNextBid, getBidIncrement } from './bidIncrement.js';
export { UserRole } from './auth.js';
export type { AuthPayload, LoginRequest, LoginResponse } from './auth.js';
export type {
  ClientRole,
  RegisterPayload,
  AuctionPhase,
  AuctionStatePayload,
  AuctionStateSyncPayload,
  SellPayload,
  ServerToClientEvents,
  ClientToServerEvents,
} from './events.js';
export { ALLOWED_COLORS } from './event.js';
export type {
  AllowedColor,
  EventConfig,
  CreateEventConfigRequest,
  TeamPublic,
  CreateTeamRequest,
  UpdateTeamRequest,
  BatchCreateTeamsRequest,
} from './event.js';
