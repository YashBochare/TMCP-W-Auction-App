import { useState } from 'react';
import type { Player, AuctionPhase } from '@auction/shared';
import './PlayerQueue.css';

interface PlayerQueueProps {
  players: Player[];
  currentPlayerId: string | null;
  phase: AuctionPhase;
  isProcessing: boolean;
  onNextPlayer: () => void;
}

export function PlayerQueue({ players, currentPlayerId, phase, isProcessing, onNextPlayer }: PlayerQueueProps) {
  const [filter, setFilter] = useState('');

  const pendingCount = players.filter(p => p.status === 'PENDING').length;
  const soldCount = players.filter(p => p.status === 'SOLD').length;
  const unsoldCount = players.filter(p => p.status === 'UNSOLD').length;

  const filtered = filter
    ? players.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    : players;

  return (
    <div className="player-queue">
      <div className="player-queue__header">
        <h3>Player Queue</h3>
        <span className="player-queue__counts">
          {pendingCount} pending
          {soldCount > 0 && <> · <span className="count-sold">{soldCount} sold</span></>}
          {unsoldCount > 0 && <> · <span className="count-unsold">{unsoldCount} unsold</span></>}
        </span>
      </div>

      {players.length > 10 && (
        <input
          className="player-queue__filter"
          type="text"
          placeholder="Search players..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      )}

      {phase === 'idle' && pendingCount > 0 && (
        <button
          className="player-queue__next-btn"
          onClick={onNextPlayer}
          disabled={isProcessing}
        >
          {isProcessing ? 'Loading...' : 'Next Player'}
        </button>
      )}

      <div className="player-queue__list">
        {filtered.map(player => {
          const isActive = player.id === currentPlayerId;
          const isPending = player.status === 'PENDING';

          return (
            <div
              key={player.id}
              className={`player-queue__row ${isActive ? 'player-queue__row--active' : ''} ${!isPending ? 'player-queue__row--done' : ''}`}
            >
              <div className="player-queue__info">
                <span className="player-queue__name">{player.name}</span>
                <span className="player-queue__role">{player.role}</span>
              </div>
              <span className="player-queue__price price">
                {player.status === 'SOLD' && player.soldPrice
                  ? `${player.soldPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`
                  : `${player.basePrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`
                }
              </span>
              <span className={`player-queue__status status-${player.status.toLowerCase()}`}>
                {isActive ? 'ACTIVE' : player.status}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="player-queue__empty">
            {players.length === 0 ? 'No players loaded' : 'No matching players'}
          </p>
        )}
      </div>
    </div>
  );
}
