import { useRef, useEffect, useState } from 'react';
import './viewer.css';

interface Props {
  bidAmount: number;
  teamName: string | null;
  phase: string;
}

export function CurrentBidDisplay({ bidAmount, teamName, phase }: Props) {
  const [animating, setAnimating] = useState(false);
  const prevBid = useRef(bidAmount);

  useEffect(() => {
    if (bidAmount !== prevBid.current && bidAmount > 0) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 400);
      prevBid.current = bidAmount;
      return () => clearTimeout(t);
    }
  }, [bidAmount]);

  if (phase === 'idle' || phase === 'player_presented') return null;

  return (
    <div className="bid-display">
      <div className="bid-display__label">Current Highest Bid</div>
      {bidAmount > 0 ? (
        <>
          <div className={`bid-display__amount ${animating ? 'bid-display__amount--updating' : ''}`}>
            &#8377;{bidAmount.toLocaleString()}
          </div>
          {teamName && <div className="bid-display__team">{teamName}</div>}
        </>
      ) : (
        <div className="bid-display__no-bids">No bids yet</div>
      )}
    </div>
  );
}
