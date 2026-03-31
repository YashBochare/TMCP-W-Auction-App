import type { AuctionPhase, TeamBidConstraints } from '@auction/shared';
import './AuctioneerTopBar.css';

interface AuctioneerTopBarProps {
  phase: AuctionPhase;
  timerSeconds: number;
  timerRunning: boolean;
  isPaused: boolean;
  connected: boolean;
  teams: TeamBidConstraints[];
  actionError: string | null;
}

const PHASE_LABELS: Record<AuctionPhase, string> = {
  idle: 'IDLE',
  player_presented: 'PLAYER UP',
  bidding_open: 'BIDDING OPEN',
  bidding_closed: 'BIDDING CLOSED',
};

const PHASE_CLASSES: Record<AuctionPhase, string> = {
  idle: 'phase-idle',
  player_presented: 'phase-presented',
  bidding_open: 'phase-open',
  bidding_closed: 'phase-closed',
};

function formatPurse(amount: number): string {
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
  return String(amount);
}

export function AuctioneerTopBar({ phase, timerSeconds, timerRunning, isPaused, connected, teams, actionError }: AuctioneerTopBarProps) {
  const timerClass = timerSeconds > 10 ? 'timer-safe' : timerSeconds > 5 ? 'timer-warning' : 'timer-danger';
  const showTimer = phase === 'bidding_open' || (phase === 'bidding_closed' && timerSeconds > 0);

  return (
    <div className="topbar">
      <div className="topbar__left">
        <span className={`topbar__phase ${PHASE_CLASSES[phase]}`}>
          {isPaused ? 'PAUSED' : PHASE_LABELS[phase]}
        </span>
        {showTimer && (
          <span className={`topbar__timer ${timerClass} ${timerRunning ? '' : 'timer-stopped'}`}>
            {timerSeconds}s
          </span>
        )}
      </div>

      <div className="topbar__teams">
        {teams.map(t => (
          <span key={t.teamId} className={`topbar__team ${!t.canBid ? 'team-disabled' : ''}`}>
            {t.teamName}: <span className="mono">{formatPurse(t.currentPurse)}</span>
            <span className="topbar__squad">{t.currentSquadSize}/7</span>
          </span>
        ))}
      </div>

      <div className="topbar__right">
        {actionError && (
          <span className="topbar__error" role="alert">{actionError}</span>
        )}
        <span
          className={`topbar__connection ${connected ? 'connected' : 'disconnected'}`}
          title={connected ? 'Connected' : 'Disconnected'}
        />
      </div>
    </div>
  );
}
