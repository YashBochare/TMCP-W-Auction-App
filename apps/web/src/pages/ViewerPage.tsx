import { useAuctionState } from '../hooks/useAuctionState';
import { PhaseIndicator } from '../components/viewer/PhaseIndicator';
import { CurrentPlayerCard } from '../components/viewer/CurrentPlayerCard';
import { CurrentBidDisplay } from '../components/viewer/CurrentBidDisplay';
import { CountdownTimer } from '../components/viewer/CountdownTimer';
import { TeamLeaderboard } from '../components/viewer/TeamLeaderboard';
import { SoldOverlay, UnsoldOverlay } from '../components/viewer/SoldUnsoldOverlay';
import '../components/viewer/viewer.css';

export function ViewerPage() {
  const state = useAuctionState('viewer');

  return (
    <div className="viewer-page">
      <div className="viewer-page__header">
        <PhaseIndicator phase={state.phase} isPaused={state.isPaused} />
        <span
          className="viewer-page__connection"
          style={{ backgroundColor: state.connected ? 'var(--accent-green)' : 'var(--accent-red)' }}
          title={state.connected ? 'Connected' : 'Disconnected'}
        />
      </div>

      <div className="viewer-page__main">
        <CurrentPlayerCard player={state.currentPlayer} />
        <CurrentBidDisplay
          bidAmount={state.currentHighestBid}
          teamName={state.currentHighestBidderTeamName}
          phase={state.phase}
        />
        <CountdownTimer
          seconds={state.timerSeconds}
          running={state.timerRunning}
          expired={state.timerExpired}
        />
      </div>

      <div className="viewer-page__sidebar">
        <TeamLeaderboard
          teams={state.teams}
          leadingTeamId={state.phase !== 'idle' ? state.currentHighestBidderTeamId : null}
        />
      </div>

      {state.soldOverlay && (
        <SoldOverlay
          playerName={state.soldOverlay.playerName}
          teamName={state.soldOverlay.teamName}
          soldPrice={state.soldOverlay.soldPrice}
        />
      )}

      {state.unsoldOverlay && (
        <UnsoldOverlay playerName={state.unsoldOverlay.playerName} />
      )}
    </div>
  );
}
