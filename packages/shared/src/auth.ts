export const UserRole = {
  AUCTIONEER: 'auctioneer',
  CAPTAIN: 'captain',
  VIEWER: 'viewer',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface AuthPayload {
  role: UserRole;
  teamId?: string;
  teamName?: string;
}

export interface LoginRequest {
  accessCode: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  teamId?: string;
  teamName?: string;
}
