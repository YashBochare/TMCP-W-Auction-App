import type { TeamBidConstraints } from '@auction/shared';
import './TeamConstraintsPanel.css';

interface TeamConstraintsPanelProps {
  teams: TeamBidConstraints[];
  leadingTeamId: string | null;
}

export function TeamConstraintsPanel({ teams, leadingTeamId }: TeamConstraintsPanelProps) {
  return (
    <div className="constraints-panel">
      <h3 className="constraints-panel__title">Team Status</h3>
      <div className="constraints-panel__list">
        {teams.map(team => (
          <div
            key={team.teamId}
            className={`constraints-panel__row ${team.teamId === leadingTeamId ? 'constraints-panel__row--leading' : ''} ${!team.canBid ? 'constraints-panel__row--disabled' : ''}`}
          >
            <div className="constraints-panel__team">{team.teamName}</div>
            <div className="constraints-panel__stats">
              <span className="constraints-panel__purse price">
                {team.currentPurse.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
              </span>
              <span className="constraints-panel__squad">{team.currentSquadSize}/7</span>
              <span className="constraints-panel__max">
                max: {team.maxBid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
