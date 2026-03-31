import type { BidProposal } from '@auction/shared';
import './BidProposalQueue.css';

interface BidProposalQueueProps {
  proposals: BidProposal[];
  onAccept: (proposalId: string) => void;
  isProcessing: boolean;
}

function getRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function BidProposalQueue({ proposals, onAccept, isProcessing }: BidProposalQueueProps) {
  return (
    <div className="bid-queue">
      <div className="bid-queue__header">
        <h3>Proposed Bids</h3>
        {proposals.length > 0 && (
          <span className="bid-queue__count">{proposals.length}</span>
        )}
      </div>

      {proposals.length === 0 ? (
        <p className="bid-queue__empty">No proposals yet — waiting for captain bids</p>
      ) : (
        <div className="bid-queue__list">
          {proposals.map((proposal, i) => (
            <div
              key={proposal.id}
              className={`bid-queue__row ${i === 0 ? 'bid-queue__row--highest' : ''}`}
            >
              <div className="bid-queue__team">{proposal.teamName}</div>
              <div className="bid-queue__amount price">
                {proposal.bidAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
              </div>
              <div className="bid-queue__time">{getRelativeTime(proposal.timestamp)}</div>
              <button
                className="bid-queue__accept"
                onClick={() => onAccept(proposal.id)}
                disabled={isProcessing}
              >
                {isProcessing ? '...' : 'Accept'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
