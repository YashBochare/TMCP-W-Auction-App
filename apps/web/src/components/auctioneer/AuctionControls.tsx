import type { AuctionPhase } from '@auction/shared';
import { ConfirmButton } from './ConfirmButton';
import './AuctionControls.css';

interface AuctionControlsProps {
  phase: AuctionPhase;
  currentHighestBid: number;
  isPaused: boolean;
  hasUndoHistory: boolean;
  isProcessing: boolean;
  actions: {
    nextPlayer: () => void;
    openBidding: () => void;
    closeBidding: () => void;
    sell: () => void;
    markUnsold: () => void;
    pause: () => void;
    resume: () => void;
    undoLastAction: () => void;
    resetAuction: () => void;
  };
}

export function AuctionControls({ phase, currentHighestBid, isPaused, hasUndoHistory, isProcessing, actions }: AuctionControlsProps) {
  // When paused, only show resume button
  if (isPaused) {
    return (
      <div className="auction-controls">
        <div className="auction-controls__paused-banner">AUCTION PAUSED</div>
        <button className="control-btn resume" onClick={actions.resume} disabled={isProcessing}>
          {isProcessing ? 'Resuming...' : 'Resume Auction'}
        </button>
      </div>
    );
  }

  return (
    <div className="auction-controls">
      {phase === 'idle' && (
        <button className="control-btn primary" onClick={actions.nextPlayer} disabled={isProcessing}>
          {isProcessing ? 'Loading...' : 'Next Player'}
        </button>
      )}

      {phase === 'player_presented' && (
        <>
          <button className="control-btn primary" onClick={actions.openBidding} disabled={isProcessing}>
            {isProcessing ? 'Opening...' : 'Open Bidding'}
          </button>
          <ConfirmButton className="control-btn unsold" onConfirm={actions.markUnsold} label="Mark Unsold" confirmLabel="Confirm Unsold?" disabled={isProcessing} />
        </>
      )}

      {phase === 'bidding_open' && (
        <>
          <button className="control-btn secondary" onClick={actions.closeBidding} disabled={isProcessing}>
            {isProcessing ? 'Closing...' : 'Close Bidding'}
          </button>
          <button className="control-btn pause" onClick={actions.pause} disabled={isProcessing}>
            Pause Auction
          </button>
          {currentHighestBid > 0 && (
            <ConfirmButton className="control-btn hammer" onConfirm={actions.sell} label="Hammer (Sell)" confirmLabel="Confirm Sell?" disabled={isProcessing} />
          )}
        </>
      )}

      {phase === 'bidding_closed' && (
        <>
          {currentHighestBid > 0 && (
            <ConfirmButton className="control-btn hammer" onConfirm={actions.sell} label="Hammer (Sell)" confirmLabel="Confirm Sell?" disabled={isProcessing} />
          )}
          <ConfirmButton className="control-btn unsold" onConfirm={actions.markUnsold} label="Mark Unsold" confirmLabel="Confirm Unsold?" disabled={isProcessing} />
        </>
      )}

      {hasUndoHistory && (
        <ConfirmButton
          className="control-btn undo"
          onConfirm={actions.undoLastAction}
          label="Undo Last Action"
          confirmLabel="Confirm Undo?"
          disabled={isProcessing}
        />
      )}

      <ConfirmButton
        className="control-btn reset"
        onConfirm={actions.resetAuction}
        label="Reset Auction"
        confirmLabel="Confirm Reset?"
        disabled={isProcessing}
      />
    </div>
  );
}
