export const ALLOWED_COLORS = [
  'slate',
  'gold',
  'navy',
  'emerald',
  'crimson',
  'violet',
  'amber',
  'teal',
] as const;

export type AllowedColor = (typeof ALLOWED_COLORS)[number];

export interface EventConfig {
  id: string;
  startingPurse: number;
  maxSquadSize: number;
  minBasePrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventConfigRequest {
  startingPurse?: number;
  maxSquadSize?: number;
  minBasePrice?: number;
}

export interface TeamPublic {
  id: string;
  name: string;
  colorCode: string;
  purse: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamRequest {
  name: string;
  accessCode: string;
  colorCode: AllowedColor;
}

export interface UpdateTeamRequest {
  name?: string;
  accessCode?: string;
  colorCode?: AllowedColor;
}

export interface BatchCreateTeamsRequest {
  teams: CreateTeamRequest[];
}
