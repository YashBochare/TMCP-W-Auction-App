import type { TeamBidConstraints, Player } from '@auction/shared';
import './TeamScoreboard.css';

interface TeamScoreboardProps {
  teams: TeamBidConstraints[];
  players: Player[];
  leadingTeamId: string | null;
}

export function TeamScoreboard({ teams, players, leadingTeamId }: TeamScoreboardProps) {
  return (
    <div className="team-scoreboard">
      <div className="team-scoreboard__grid">
        {teams.map(team => {
          const teamPlayers = players.filter(p => p.teamId === team.teamId && p.status === 'SOLD');
          const isLeading = team.teamId === leadingTeamId;

          return (
            <div key={team.teamId} className={`team-scoreboard__card ${isLeading ? 'team-scoreboard__card--leading' : ''}`}>
              <div className="team-scoreboard__header">
                <h3 className="team-scoreboard__name">{team.teamName}</h3>
                {isLeading && <span className="team-scoreboard__badge">LEADING</span>}
              </div>
              <div className="team-scoreboard__stats">
                <span className="team-scoreboard__purse">
                  {team.currentPurse.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </span>
                <span className="team-scoreboard__squad">{team.currentSquadSize} players</span>
              </div>
              {teamPlayers.length > 0 && (
                <ul className="team-scoreboard__players">
                  {teamPlayers.map(p => (
                    <li key={p.id} className="team-scoreboard__player">
                      <span>{p.name}</span>
                      <span className="team-scoreboard__player-price">
                        {p.soldPrice?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                      </span>
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
