import type { AuctionPhase } from '@auction/shared';
import { ConfirmButton } from './ConfirmButton';
import './AuctionControls.css';

interface AuctionControlsProps {
  phase: AuctionPhase;
  currentHighestBid: number;
  isProcessing: boolean;
  actions: {
    nextPlayer: () => void;
    openBidding: () => void;
    closeBidding: () => void;
    sell: () => void;
    markUnsold: () => void;
  };
}

export function AuctionControls({ phase, currentHighestBid, isProcessing, actions }: AuctionControlsProps) {
  return (
    <div className="auction-controls">
      {phase === 'idle' && (
        <button
          className="control-btn primary"
          onClick={actions.nextPlayer}
          disabled={isProcessing}
        >
          {isProcessing ? 'Loading...' : 'Next Player'}
        </button>
      )}

      {phase === 'player_presented' && (
        <>
          <button
            className="control-btn primary"
            onClick={actions.openBidding}
            disabled={isProcessing}
          >
            {isProcessing ? 'Opening...' : 'Open Bidding'}
          </button>
          <ConfirmButton
            className="control-btn unsold"
            onConfirm={actions.markUnsold}
            label="Mark Unsold"
            confirmLabel="Confirm Unsold?"
            disabled={isProcessing}
          />
        </>
      )}

      {phase === 'bidding_open' && (
        <>
          <button
            className="control-btn secondary"
            onClick={actions.closeBidding}
            disabled={isProcessing}
          >
            {isProcessing ? 'Closing...' : 'Close Bidding'}
          </button>
          {currentHighestBid > 0 && (
            <ConfirmButton
              className="control-btn hammer"
              onConfirm={actions.sell}
              label="Hammer (Sell)"
              confirmLabel="Confirm Sell?"
              disabled={isProcessing}
            />
          )}
        </>
      )}

      {phase === 'bidding_closed' && (
        <>
          {currentHighestBid > 0 && (
            <ConfirmButton
              className="control-btn hammer"
              onConfirm={actions.sell}
              label="Hammer (Sell)"
              confirmLabel="Confirm Sell?"
              disabled={isProcessing}
            />
          )}
          <ConfirmButton
            className="control-btn unsold"
            onConfirm={actions.markUnsold}
            label="Mark Unsold"
            confirmLabel="Confirm Unsold?"
            disabled={isProcessing}
          />
        </>
      )}
    </div>
  );
}
