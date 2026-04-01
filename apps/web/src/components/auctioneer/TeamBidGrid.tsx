import type { TeamBidConstraints, AuctionPhase } from '@auction/shared';
import { getNextBid } from '@auction/shared';
import './TeamBidGrid.css';

interface TeamBidGridProps {
  teams: TeamBidConstraints[];
  teamColors: Record<string, string>;
  currentHighestBidderTeamId: string | null;
  currentBid: number;
  basePrice: number;
  phase: AuctionPhase;
  isPaused: boolean;
  isProcessing: boolean;
  onRegisterBid: (teamId: string) => void;
}

export function TeamBidGrid({
  teams,
  teamColors,
  currentHighestBidderTeamId,
  currentBid,
  basePrice,
  phase,
  isPaused,
  isProcessing,
  onRegisterBid,
}: TeamBidGridProps) {
  const nextBid = getNextBid(currentBid, basePrice);
  const biddingActive = phase === 'bidding_open' && !isPaused;

  return (
    <div className="team-bid-grid">
      <h3 className="team-bid-grid__title">
        Register Bid
        {biddingActive && <span className="team-bid-grid__next-amount">Next: {formatCurrency(nextBid)}</span>}
      </h3>
      <div className="team-bid-grid__buttons">
        {teams.map((team) => {
          const isHighest = team.teamId === currentHighestBidderTeamId;
          const canAfford = team.canBid && nextBid <= team.maxBid;
          const disabled = !biddingActive || isProcessing || isHighest || !canAfford;

          return (
            <button
              key={team.teamId}
              className={`team-bid-grid__btn ${isHighest ? 'team-bid-grid__btn--highest' : ''} ${!canAfford && !isHighest ? 'team-bid-grid__btn--cant-afford' : ''}`}
              style={{ '--team-color': teamColors[team.teamId] || getTeamColor(team.teamName) } as React.CSSProperties}
              disabled={disabled}
              onClick={() => onRegisterBid(team.teamId)}
            >
              <span className="team-bid-grid__team-name">{team.teamName}</span>
              <span className="team-bid-grid__purse">{formatCurrency(team.currentPurse)}</span>
              {isHighest && <span className="team-bid-grid__badge">LEADING</span>}
              {!canAfford && !isHighest && <span className="team-bid-grid__badge team-bid-grid__badge--warn">CAN'T BID</span>}
            </button>
          );
        })}
      </div>
      {!biddingActive && phase !== 'bidding_open' && (
        <p className="team-bid-grid__hint">Open bidding to register bids</p>
      )}
      {isPaused && (
        <p className="team-bid-grid__hint">Auction paused — resume to register bids</p>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function getTeamColor(teamName: string): string {
  // Simple hash-based color fallback — actual colors come from DB colorCode
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
