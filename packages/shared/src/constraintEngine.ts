import type { BidValidationResult } from './types.js';

export function calculateMaxBid(
  currentPurse: number,
  _currentSquadSize: number,
  _minBasePrice: number,
  _maxSquadSize: number
): number {
  // Squad-size and min-base-price reservation constraints removed.
  // A team can spend its entire purse on a single player.
  return Math.max(0, currentPurse);
}

export function canTeamBid(
  currentPurse: number,
  _currentSquadSize: number,
  _minBasePrice: number,
  _maxSquadSize: number
): boolean {
  return currentPurse > 0;
}

export function validateBid(
  bidAmount: number,
  currentPurse: number,
  _currentSquadSize: number,
  _minBasePrice: number,
  _maxSquadSize: number,
  currentHighestBid: number
): BidValidationResult {
  if (typeof bidAmount !== 'number' || !Number.isFinite(bidAmount) || bidAmount <= 0 || !Number.isInteger(bidAmount)) {
    return { valid: false, reason: 'Bid amount must be a positive integer' };
  }
  if (bidAmount <= currentHighestBid) {
    return { valid: false, reason: `Bid must exceed current highest bid of ${currentHighestBid}` };
  }
  if (bidAmount > currentPurse) {
    return { valid: false, reason: `Bid exceeds available purse of ${currentPurse}` };
  }
  return { valid: true };
}
