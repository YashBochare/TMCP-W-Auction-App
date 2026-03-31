import type { BidValidationResult } from './types.js';

export function calculateMaxBid(
  currentPurse: number,
  currentSquadSize: number,
  minBasePrice: number,
  maxSquadSize: number
): number {
  if (currentPurse < 0 || currentSquadSize < 0) return 0;
  if (currentSquadSize >= maxSquadSize) return 0;

  const slotsToFillAfterCurrent = maxSquadSize - currentSquadSize - 1;
  const reservedFunds = slotsToFillAfterCurrent * minBasePrice;
  const maxBid = currentPurse - reservedFunds;

  return Math.max(0, maxBid);
}

export function canTeamBid(
  currentPurse: number,
  currentSquadSize: number,
  minBasePrice: number,
  maxSquadSize: number
): boolean {
  if (currentSquadSize >= maxSquadSize) return false;
  return calculateMaxBid(currentPurse, currentSquadSize, minBasePrice, maxSquadSize) > 0;
}

export function validateBid(
  bidAmount: number,
  currentPurse: number,
  currentSquadSize: number,
  minBasePrice: number,
  maxSquadSize: number,
  currentHighestBid: number
): BidValidationResult {
  if (typeof bidAmount !== 'number' || !Number.isFinite(bidAmount) || bidAmount <= 0 || !Number.isInteger(bidAmount)) {
    return { valid: false, reason: 'Bid amount must be a positive integer' };
  }
  if (currentSquadSize >= maxSquadSize) {
    return { valid: false, reason: `Team already has maximum players (${maxSquadSize})` };
  }
  if (bidAmount < minBasePrice) {
    return { valid: false, reason: `Bid must be at least ${minBasePrice}` };
  }
  if (bidAmount <= currentHighestBid) {
    return { valid: false, reason: `Bid must exceed current highest bid of ${currentHighestBid}` };
  }
  if (bidAmount > currentPurse) {
    return { valid: false, reason: `Bid exceeds available purse of ${currentPurse}` };
  }
  const maxBid = calculateMaxBid(currentPurse, currentSquadSize, minBasePrice, maxSquadSize);
  if (bidAmount > maxBid) {
    return { valid: false, reason: `Bid exceeds maximum allowed bid of ${maxBid}` };
  }
  return { valid: true };
}
