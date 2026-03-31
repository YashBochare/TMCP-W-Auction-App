import { useState, useMemo } from 'react';
import type { AuctionPhase, TeamBidConstraints } from '@auction/shared';
import './ManualBidPanel.css';

interface ManualBidPanelProps {
  teams: TeamBidConstraints[];
  currentHighestBid: number;
  phase: AuctionPhase;
  isProcessing: boolean;
  onForceAcceptBid: (teamId: string, bidAmount: number) => void;
}

export function ManualBidPanel({ teams, currentHighestBid, phase, isProcessing, onForceAcceptBid }: ManualBidPanelProps) {
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const isBiddingPhase = phase === 'bidding_open' || phase === 'bidding_closed';

  const selectedTeam = useMemo(
    () => teams.find(t => t.teamId === selectedTeamId),
    [teams, selectedTeamId]
  );

  const parsedAmount = Number(bidAmount);
  const isValidNumber = bidAmount !== '' && Number.isFinite(parsedAmount) && Number.isInteger(parsedAmount) && parsedAmount > 0;

  const validationError = useMemo(() => {
    if (!selectedTeamId) return null;
    if (!bidAmount) return null;
    if (!isValidNumber) return 'Enter a valid positive integer';
    if (parsedAmount <= currentHighestBid) return `Amount must exceed current bid of ${currentHighestBid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`;
    if (selectedTeam && parsedAmount > selectedTeam.maxBid) return `Amount exceeds team's maximum budget of ${selectedTeam.maxBid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`;
    return null;
  }, [selectedTeamId, bidAmount, isValidNumber, parsedAmount, currentHighestBid, selectedTeam]);

  const canSubmit = selectedTeamId && isValidNumber && !validationError && !isProcessing && isBiddingPhase;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onForceAcceptBid(selectedTeamId, parsedAmount);
    setBidAmount('');
  };

  if (!isBiddingPhase) return null;

  return (
    <div className="manual-bid-panel">
      <button
        className="manual-bid-panel__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▾' : '▸'} Manual Bid
      </button>

      {isExpanded && (
        <div className="manual-bid-panel__body">
          <div className="manual-bid-panel__field">
            <label className="manual-bid-panel__label">Team</label>
            <select
              className="manual-bid-panel__select"
              value={selectedTeamId}
              onChange={e => setSelectedTeamId(e.target.value)}
            >
              <option value="">Select team...</option>
              {teams.map(team => (
                <option
                  key={team.teamId}
                  value={team.teamId}
                  disabled={!team.canBid || team.maxBid <= currentHighestBid}
                >
                  {team.teamName}
                  {(!team.canBid || team.maxBid <= currentHighestBid) ? ' (cannot bid)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="manual-bid-panel__field">
            <label className="manual-bid-panel__label">Amount</label>
            <input
              className="manual-bid-panel__input"
              type="number"
              min={currentHighestBid + 1}
              max={selectedTeam?.maxBid}
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder={`Min: ${(currentHighestBid + 1).toLocaleString('en-IN')}`}
            />
          </div>

          {validationError && (
            <div className="manual-bid-panel__error">{validationError}</div>
          )}

          <button
            className="manual-bid-panel__submit"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isProcessing ? 'Processing...' : 'Force Bid'}
          </button>
        </div>
      )}
    </div>
  );
}
