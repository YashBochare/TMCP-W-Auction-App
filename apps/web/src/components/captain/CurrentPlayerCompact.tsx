import type { Player } from '@auction/shared';
import './captain.css';

export function CurrentPlayerCompact({ player }: { player: Player | null }) {
  if (!player) {
    return <div className="player-compact player-compact--empty">Waiting for next player...</div>;
  }

  return (
    <div className="player-compact">
      <div className="player-compact__name">{player.name}</div>
      <div className="player-compact__meta">{player.role} &middot; {player.clubLevel}</div>
      <div className="player-compact__base">Base: <span className="price">&#8377;{player.basePrice.toLocaleString()}</span></div>
    </div>
  );
}
