import { useState } from 'react';
import './captain.css';

interface Props {
  currentBid: number;
  maxBid: number;
  canBid: boolean;
  phase: string;
  isSending: boolean;
  onProposeBid: (amount: number) => void;
}

const INCREMENTS = [3000, 5000, 10000];

export function BiddingControls({ currentBid, maxBid, canBid, phase, isSending, onProposeBid }: Props) {
  const [customAmount, setCustomAmount] = useState('');
  const disabled = phase !== 'bidding_open' || !canBid || isSending;

  const handleIncrement = (inc: number) => {
    if (disabled) return;
    const amount = currentBid + inc;
    onProposeBid(amount);
  };

  const handleCustomSubmit = () => {
    const amount = parseInt(customAmount, 10);
    if (!amount || amount <= currentBid || amount > maxBid || disabled) return;
    onProposeBid(amount);
    setCustomAmount('');
  };

  return (
    <div className="bidding-controls">
      <div className="bidding-controls__increments">
        {INCREMENTS.map((inc) => {
          const resultAmount = currentBid + inc;
          const btnDisabled = disabled || resultAmount > maxBid;
          return (
            <button
              key={inc}
              className={`bidding-controls__btn ${btnDisabled ? 'bidding-controls__btn--disabled' : ''}`}
              disabled={btnDisabled}
              onClick={() => handleIncrement(inc)}
            >
              <span className="bidding-controls__inc">+&#8377;{inc.toLocaleString()}</span>
              {!btnDisabled && <span className="bidding-controls__result">→ &#8377;{resultAmount.toLocaleString()}</span>}
            </button>
          );
        })}
      </div>

      <div className="bidding-controls__custom">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Custom amount..."
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ''))}
          disabled={disabled}
          className="bidding-controls__input"
        />
        <button
          className={`bidding-controls__submit ${disabled || !customAmount ? 'bidding-controls__submit--disabled' : ''}`}
          disabled={disabled || !customAmount}
          onClick={handleCustomSubmit}
        >
          {isSending ? 'SENDING...' : 'PROPOSE BID'}
        </button>
      </div>
    </div>
  );
}
