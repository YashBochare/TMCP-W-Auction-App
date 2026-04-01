import type { Player } from '@auction/shared';
import './CaptainDashboard.css';

interface CaptainDashboardProps {
  teamName: string;
  teamColor: string;
  purse: number;
  squadSize: number;
  maxSquadSize: number;
  myPlayers: Player[];
  connected: boolean;
}

export function CaptainDashboard({ teamName, teamColor, purse, squadSize, maxSquadSize, myPlayers, connected }: CaptainDashboardProps) {
  const purseClass = purse < 10000 ? 'captain-dash__purse--danger' : purse < 20000 ? 'captain-dash__purse--warning' : '';

  return (
    <div className="captain-dash">
      <div className="captain-dash__header" style={{ borderColor: teamColor }}>
        <h2 className="captain-dash__team-name">{teamName || 'Loading...'}</h2>
        <span className={`captain-dash__connection ${connected ? 'captain-dash__connection--on' : ''}`} />
      </div>

      <div className={`captain-dash__purse ${purseClass}`}>
        <span className="captain-dash__purse-label">Purse Remaining</span>
        <span className="captain-dash__purse-amount">
          {purse.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="captain-dash__squad">
        <span className="captain-dash__squad-label">Players Acquired</span>
        <span className="captain-dash__squad-count">{squadSize} / {maxSquadSize}</span>
      </div>

      <div className="captain-dash__players">
        {myPlayers.length > 0 ? (
          <ul className="captain-dash__player-list">
            {myPlayers.map(p => (
              <li key={p.id} className="captain-dash__player-item">
                <span className="captain-dash__player-name">{p.name}</span>
                <span className="captain-dash__player-role">{p.role}</span>
                <span className="captain-dash__player-price">
                  {p.soldPrice?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="captain-dash__empty">No players acquired yet</p>
        )}
      </div>
    </div>
  );
}
