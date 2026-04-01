/**
 * Bid increment tier logic for the physical bidding model.
 * First bid = base price. Subsequent bids increment by tier:
 *   < 10,000: +500
 *   10,000–20,000: +1,000
 *   > 20,000: +2,000
 */

export function getBidIncrement(currentBid: number): number {
  if (currentBid < 10000) return 500;
  if (currentBid < 20000) return 1000;
  return 2000;
}

export function getNextBid(currentBid: number, basePrice: number): number {
  if (currentBid === 0) return Math.max(basePrice, 1);
  return currentBid + getBidIncrement(currentBid);
}
