import './captain.css';

type BidStatus = 'waiting' | 'proposed' | 'highest_bidder' | 'outbid' | 'insufficient' | 'squad_full';

interface Props {
  currentBid: number;
  leadingTeam: string | null;
  myMaxBid: number;
  bidStatus: BidStatus;
}

const STATUS_CONFIG: Record<BidStatus, { label: string; className: string }> = {
  waiting: { label: 'WAITING', className: 'status-waiting' },
  proposed: { label: 'BID PROPOSED', className: 'status-proposed' },
  highest_bidder: { label: 'HIGHEST BIDDER', className: 'status-highest' },
  outbid: { label: 'OUTBID!', className: 'status-outbid' },
  insufficient: { label: 'INSUFFICIENT FUNDS', className: 'status-disabled' },
  squad_full: { label: 'SQUAD FULL (7/7)', className: 'status-disabled' },
};

export function BidStatusPanel({ currentBid, leadingTeam, myMaxBid, bidStatus }: Props) {
  const config = STATUS_CONFIG[bidStatus];

  return (
    <div className="bid-status-panel">
      <div className={`bid-status-panel__banner ${config.className}`}>{config.label}</div>
      <div className="bid-status-panel__row">
        <div className="bid-status-panel__col">
          <div className="bid-status-panel__label">Current Bid</div>
          <div className="bid-status-panel__value price">
            {currentBid > 0 ? `₹${currentBid.toLocaleString()}` : '—'}
          </div>
          {leadingTeam && <div className="bid-status-panel__team">{leadingTeam}</div>}
        </div>
        <div className="bid-status-panel__col">
          <div className="bid-status-panel__label">Your Max</div>
          <div className="bid-status-panel__value price" style={{ color: 'var(--accent-blue)' }}>
            &#8377;{myMaxBid.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
