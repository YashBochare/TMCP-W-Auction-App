import type { TeamBidConstraints } from '@auction/shared';
import './viewer.css';

interface Props {
  teams: TeamBidConstraints[];
  leadingTeamId: string | null;
}

export function TeamLeaderboard({ teams, leadingTeamId }: Props) {
  const sorted = [...teams].sort((a, b) => b.currentPurse - a.currentPurse);

  return (
    <div className="leaderboard">
      <h3 className="leaderboard__title">Teams</h3>
      <div className="leaderboard__list">
        {sorted.map((team) => (
          <div key={team.teamId} className={`leaderboard__row ${team.teamId === leadingTeamId ? 'leaderboard__row--leading' : ''}`}>
            <div className="leaderboard__name">{team.teamName}</div>
            <div className="leaderboard__stats">
              <span className="price">&#8377;{team.currentPurse.toLocaleString()}</span>
              <span className="leaderboard__squad">{team.currentSquadSize}/7</span>
            </div>
            {team.teamId === leadingTeamId && <span className="leaderboard__badge">LEADING</span>}
          </div>
        ))}
        {teams.length === 0 && <div className="leaderboard__empty">No teams configured</div>}
      </div>
    </div>
  );
}
