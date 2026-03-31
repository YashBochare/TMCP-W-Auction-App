import { auctionTimer } from './auctionTimer.js';

export function getTimerState() {
  return {
    timerSeconds: auctionTimer.getSecondsRemaining(),
    timerRunning: auctionTimer.isRunning(),
  };
}
