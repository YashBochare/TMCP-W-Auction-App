import type { AuctionPhase } from '@auction/shared';
import './viewer.css';

const PHASE_CONFIG: Record<AuctionPhase, { label: string; className: string }> = {
  idle: { label: 'Waiting', className: 'phase--idle' },
  player_presented: { label: 'Player Up', className: 'phase--presented' },
  bidding_open: { label: 'BIDDING OPEN', className: 'phase--open' },
  bidding_closed: { label: 'BIDDING CLOSED', className: 'phase--closed' },
};

export function PhaseIndicator({ phase, isPaused }: { phase: AuctionPhase; isPaused: boolean }) {
  const config = PHASE_CONFIG[phase];

  return (
    <div className={`phase-indicator ${config.className}`}>
      <span className="phase-indicator__dot" />
      <span className="phase-indicator__label">{isPaused ? 'PAUSED' : config.label}</span>
    </div>
  );
}
