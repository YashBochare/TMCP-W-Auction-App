import type { Player } from '@auction/shared';
import './viewer.css';

export function CurrentPlayerCard({ player }: { player: Player | null }) {
  if (!player) {
    return (
      <div className="player-card player-card--empty">
        <div className="player-card__placeholder">Waiting for Next Player...</div>
      </div>
    );
  }

  return (
    <div className="player-card" key={player.id}>
      <div className="player-card__photo">
        {player.photoUrl ? (
          <img src={player.photoUrl} alt={player.name} />
        ) : (
          <div className="player-card__avatar">{player.name.charAt(0)}</div>
        )}
      </div>
      <h2 className="player-card__name">{player.name}</h2>
      <div className="player-card__attrs">
        <span className="chip">{player.club}</span>
        <span className="chip">{player.experience}</span>
        <span className="chip">{player.education}</span>
        {player.contests && <span className="chip">{player.contests}</span>}
      </div>
      {player.message && (
        <div className="player-card__message">"{player.message}"</div>
      )}
      <div className="player-card__base-price">
        Base Price: <span className="price">&#8377;{player.basePrice.toLocaleString()}</span>
      </div>
    </div>
  );
}
