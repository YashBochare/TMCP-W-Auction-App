import type { TeamBidConstraints, Player } from '@auction/shared';
import './TeamConstraintsPanel.css';

interface TeamConstraintsPanelProps {
  teams: TeamBidConstraints[];
  leadingTeamId: string | null;
  players?: Player[];
}

function formatINR(n: number): string {
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

export function TeamConstraintsPanel({ teams, leadingTeamId, players = [] }: TeamConstraintsPanelProps) {
  return (
    <div className="constraints-panel">
      <h3 className="constraints-panel__title">Teams & Players</h3>
      <div className="constraints-panel__list">
        {teams.map(team => {
          const teamPlayers = players.filter(p => p.teamId === team.teamId && p.status === 'SOLD');
          return (
            <div
              key={team.teamId}
              className={`constraints-panel__row ${team.teamId === leadingTeamId ? 'constraints-panel__row--leading' : ''} ${!team.canBid ? 'constraints-panel__row--disabled' : ''}`}
            >
              <div className="constraints-panel__header">
                <div className="constraints-panel__team">{team.teamName}</div>
                <div className="constraints-panel__stats">
                  <span className="constraints-panel__purse price">{formatINR(team.currentPurse)}</span>
                  <span className="constraints-panel__squad">{team.currentSquadSize} players</span>
                </div>
              </div>
              {teamPlayers.length > 0 && (
                <ul className="constraints-panel__players">
                  {teamPlayers.map(p => (
                    <li key={p.id} className="constraints-panel__player">
                      <span className="constraints-panel__player-name">{p.name}</span>
                      <span className="constraints-panel__player-price">{p.soldPrice ? formatINR(p.soldPrice) : '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
