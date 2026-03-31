import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuctioneerState } from '../hooks/useAuctioneerState';
import { AuctioneerTopBar } from '../components/auctioneer/AuctioneerTopBar';
import { CurrentPlayerPanel } from '../components/auctioneer/CurrentPlayerPanel';
import { BidProposalQueue } from '../components/auctioneer/BidProposalQueue';
import { AuctionControls } from '../components/auctioneer/AuctionControls';
import { PlayerQueue } from '../components/auctioneer/PlayerQueue';
import { TeamConstraintsPanel } from '../components/auctioneer/TeamConstraintsPanel';
import './AdminPage.css';

export function AdminPage() {
  const { user, logout } = useAuth();
  const state = useAuctioneerState(user?.token);

  // P4: Keyboard shortcuts with debounce guard
  const keyLockRef = useRef(false);
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.repeat || keyLockRef.current) return;

      keyLockRef.current = true;
      setTimeout(() => { keyLockRef.current = false; }, 300);

      switch (e.key.toLowerCase()) {
        case 'n':
          if (state.phase === 'idle') state.actions.nextPlayer();
          break;
        case 'o':
          if (state.phase === 'player_presented') state.actions.openBidding();
          break;
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [state.phase, state.actions]);

  return (
    <div className="admin-page">
      <AuctioneerTopBar
        phase={state.phase}
        timerSeconds={state.timerSeconds}
        timerRunning={state.timerRunning}
        isPaused={state.isPaused}
        connected={state.connected}
        teams={state.teams}
        actionError={state.actionError}
      />

      <div className="admin-page__grid">
        {/* Left Column: Player Info + Controls */}
        <div className="admin-page__left">
          <CurrentPlayerPanel
            player={state.currentPlayer}
            currentHighestBid={state.currentHighestBid}
            currentHighestBidderTeamName={state.currentHighestBidderTeamName}
          />
          <AuctionControls
            phase={state.phase}
            currentHighestBid={state.currentHighestBid}
            isProcessing={state.isProcessing}
            actions={state.actions}
          />
          <TeamConstraintsPanel
            teams={state.teams}
            leadingTeamId={state.phase !== 'idle' ? state.currentHighestBidderTeamId : null}
          />
        </div>

        {/* Center Column: Bid Proposals */}
        <div className="admin-page__center">
          <BidProposalQueue
            proposals={state.proposals}
            onAccept={state.actions.acceptBid}
            isProcessing={state.isProcessing}
          />
        </div>

        {/* Right Column: Player Queue */}
        <div className="admin-page__right">
          <PlayerQueue
            players={state.players}
            currentPlayerId={state.currentPlayer?.id ?? null}
            phase={state.phase}
            isProcessing={state.isProcessing}
            onNextPlayer={state.actions.nextPlayer}
          />
        </div>
      </div>

      {/* Sold/Unsold Overlays — using base hook's single overlay system */}
      {state.soldOverlay && (
        <div className="admin-page__overlay admin-page__overlay--sold">
          <div className="admin-page__overlay-content">
            <span className="admin-page__overlay-label">SOLD</span>
            <span className="admin-page__overlay-player">{state.soldOverlay.playerName}</span>
            <span className="admin-page__overlay-detail">
              to {state.soldOverlay.teamName} for{' '}
              <span className="price">
                {state.soldOverlay.soldPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
              </span>
            </span>
          </div>
        </div>
      )}

      {state.unsoldOverlay && (
        <div className="admin-page__overlay admin-page__overlay--unsold">
          <div className="admin-page__overlay-content">
            <span className="admin-page__overlay-label">UNSOLD</span>
            <span className="admin-page__overlay-player">{state.unsoldOverlay.playerName}</span>
          </div>
        </div>
      )}

      {/* Logout (small, top-right corner) */}
      <button className="admin-page__logout" onClick={logout} title="Logout">
        Logout
      </button>

      {/* Min-width warning */}
      <div className="admin-page__mobile-warning">
        Use tablet or desktop for auctioneer dashboard
      </div>
    </div>
  );
}
