import type { AuctionPhase } from '@auction/shared';
import './captain.css';

interface Props {
  phase: AuctionPhase;
  timerSeconds: number;
  timerRunning: boolean;
  connected: boolean;
  bidStatus: string;
}

const PHASE_LABELS: Record<AuctionPhase, string> = {
  idle: 'WAITING',
  player_presented: 'PLAYER UP',
  bidding_open: 'BIDDING OPEN',
  bidding_closed: 'CLOSED',
};

export function CaptainStatusBar({ phase, timerSeconds, timerRunning, connected, bidStatus }: Props) {
  const timerColor = timerSeconds > 10 ? 'var(--timer-safe)' : timerSeconds > 5 ? 'var(--timer-warning)' : 'var(--timer-danger)';
  const statusTint = bidStatus === 'highest_bidder' ? 'captain-bar--green' : bidStatus === 'outbid' ? 'captain-bar--red' : '';

  return (
    <div className={`captain-bar ${statusTint}`}>
      <span className={`captain-bar__phase captain-bar__phase--${phase}`}>{PHASE_LABELS[phase]}</span>
      {timerRunning && <span className="captain-bar__timer" style={{ color: timerColor }}>{timerSeconds}s</span>}
      <span className="captain-bar__dot" style={{ backgroundColor: connected ? 'var(--accent-green)' : 'var(--accent-red)' }} />
    </div>
  );
}
