import { calculateMaxBid, canTeamBid, validateBid } from '@auction/shared';
import type { TeamBidConstraints, BidValidationResult } from '@auction/shared';
import { getPrisma } from '../lib/prisma.js';

async function getAuctionConfig() {
  const config = await getPrisma().eventConfig.findFirst();
  return {
    minBasePrice: config?.minBasePrice ?? 3000,
    maxSquadSize: config?.maxSquadSize ?? 7,
    startingPurse: config?.startingPurse ?? 100000,
  };
}

export async function getTeamConstraints(teamId: string): Promise<TeamBidConstraints> {
  const [team, config] = await Promise.all([
    getPrisma().team.findUnique({
      where: { id: teamId },
      include: { _count: { select: { players: { where: { status: 'SOLD' } } } } },
    }),
    getAuctionConfig(),
  ]);
  if (!team) throw new Error(`Team ${teamId} not found`);

  const squadSize = team._count.players;

  const maxBid = calculateMaxBid(team.purse, squadSize, config.minBasePrice, config.maxSquadSize);

  return {
    teamId: team.id,
    teamName: team.name,
    currentPurse: team.purse,
    currentSquadSize: squadSize,
    maxBid,
    canBid: squadSize < config.maxSquadSize && maxBid > 0,
  };
}

export async function getAllTeamConstraints(): Promise<TeamBidConstraints[]> {
  const [teams, config] = await Promise.all([
    getPrisma().team.findMany({
      include: { _count: { select: { players: { where: { status: 'SOLD' } } } } },
    }),
    getAuctionConfig(),
  ]);

  return teams.map((team) => {
    const squadSize = team._count.players;
    const maxBid = calculateMaxBid(team.purse, squadSize, config.minBasePrice, config.maxSquadSize);
    return {
      teamId: team.id,
      teamName: team.name,
      currentPurse: team.purse,
      currentSquadSize: squadSize,
      maxBid,
      canBid: squadSize < config.maxSquadSize && maxBid > 0,
    };
  });
}

export async function validateTeamBid(
  teamId: string,
  bidAmount: number,
  currentHighestBid: number
): Promise<BidValidationResult> {
  if (typeof bidAmount !== 'number' || !Number.isFinite(bidAmount) || bidAmount <= 0) {
    return { valid: false, reason: 'Bid amount must be a positive number' };
  }

  const [team, config] = await Promise.all([
    getPrisma().team.findUnique({ where: { id: teamId } }),
    getAuctionConfig(),
  ]);
  if (!team) return { valid: false, reason: `Team ${teamId} not found` };

  const squadSize = await getPrisma().player.count({
    where: { teamId, status: 'SOLD' },
  });

  return validateBid(
    bidAmount,
    team.purse,
    squadSize,
    config.minBasePrice,
    config.maxSquadSize,
    currentHighestBid
  );
}
