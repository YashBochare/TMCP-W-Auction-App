import type { Player } from '@auction/shared';
import './CurrentPlayerPanel.css';

interface CurrentPlayerPanelProps {
  player: Player | null;
  currentHighestBid: number;
  currentHighestBidderTeamName: string | null;
}

export function CurrentPlayerPanel({ player, currentHighestBid, currentHighestBidderTeamName }: CurrentPlayerPanelProps) {
  if (!player) {
    return (
      <div className="player-panel player-panel--empty">
        <div className="player-panel__avatar player-panel__avatar--placeholder" />
        <p className="player-panel__waiting">Waiting for next player...</p>
      </div>
    );
  }

  return (
    <div className="player-panel">
      {player.photoUrl ? (
        <img className="player-panel__avatar" src={player.photoUrl} alt={player.name} />
      ) : (
        <div className="player-panel__avatar player-panel__avatar--placeholder">
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <h2 className="player-panel__name">{player.name}</h2>
      <div className="player-panel__attrs">
        <span className="player-panel__attr"><strong>Club:</strong> {player.club}</span>
        <span className="player-panel__attr"><strong>Experience:</strong> {player.experience}</span>
        <span className="player-panel__attr"><strong>Education:</strong> {player.education}</span>
        <span className="player-panel__attr"><strong>Contests:</strong> {player.contests}</span>
        {player.message && <span className="player-panel__attr"><strong>Message:</strong> {player.message}</span>}
      </div>
      <div className="player-panel__base">
        Base: <span className="price">{player.basePrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</span>
      </div>
      <div className={`player-panel__bid ${currentHighestBid > 0 ? 'player-panel__bid--active' : ''}`}>
        {currentHighestBid > 0 ? (
          <>
            <span className="player-panel__bid-amount price">
              {currentHighestBid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
            </span>
            {currentHighestBidderTeamName && (
              <span className="player-panel__bid-team">{currentHighestBidderTeamName}</span>
            )}
          </>
        ) : (
          <span className="player-panel__no-bid">No bids yet</span>
        )}
      </div>
    </div>
  );
}
