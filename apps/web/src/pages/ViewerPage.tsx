import { useEffect, useState, useRef } from 'react';
import type { Player } from '@auction/shared';
import { useAuctionState } from '../hooks/useAuctionState';
import { PhaseIndicator } from '../components/viewer/PhaseIndicator';
import { CurrentPlayerCard } from '../components/viewer/CurrentPlayerCard';
import { CurrentBidDisplay } from '../components/viewer/CurrentBidDisplay';
import { TeamScoreboard } from '../components/viewer/TeamScoreboard';
import { SoldOverlay, UnsoldOverlay } from '../components/viewer/SoldUnsoldOverlay';
import '../components/viewer/viewer.css';

export function ViewerPage() {
  const state = useAuctionState('viewer');
  const [players, setPlayers] = useState<Player[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch all players on connect
  useEffect(() => {
    if (!state.connected) return;
    const controller = new AbortController();
    fetch('/api/players', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data && mountedRef.current) setPlayers(data.data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [state.connected]);

  // Refresh players when sold/unsold/rosterRefreshed events occur
  useEffect(() => {
    const socket = state.socket.current;
    if (!socket) return;

    const refresh = () => {
      fetch('/api/players')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.data && mountedRef.current) setPlayers(data.data);
        })
        .catch(() => {});
    };

    socket.on('auction:sold', refresh);
    socket.on('auction:unsold', refresh);
    socket.on('auction:rosterRefreshed', refresh);

    return () => {
      socket.off('auction:sold', refresh);
      socket.off('auction:unsold', refresh);
      socket.off('auction:rosterRefreshed', refresh);
    };
  }, [state.socket]);

  const isBidding = state.phase === 'bidding_open' || state.phase === 'bidding_closed' || state.phase === 'player_presented';

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

      {isBidding && (
        <div className="viewer-page__main">
          <CurrentPlayerCard player={state.currentPlayer} />
          <CurrentBidDisplay
            bidAmount={state.currentHighestBid}
            teamName={state.currentHighestBidderTeamName}
            phase={state.phase}
          />
        </div>
      )}

      <TeamScoreboard
        teams={state.teams}
        players={players}
        leadingTeamId={state.phase !== 'idle' ? state.currentHighestBidderTeamId : null}
      />

      {state.isPaused && (
        <div className="overlay overlay--paused">
          <div className="overlay__content">
            <div className="overlay__title overlay__title--paused">AUCTION PAUSED</div>
          </div>
        </div>
      )}

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
