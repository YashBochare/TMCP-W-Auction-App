import { useCaptainBidding } from '../hooks/useCaptainBidding';
import { CaptainStatusBar } from '../components/captain/CaptainStatusBar';
import { CurrentPlayerCompact } from '../components/captain/CurrentPlayerCompact';
import { BidStatusPanel } from '../components/captain/BidStatusPanel';
import { PurseAndSquad } from '../components/captain/PurseAndSquad';
import { BiddingControls } from '../components/captain/BiddingControls';
import '../components/captain/captain.css';

export function CaptainPage() {
  const state = useCaptainBidding();

  return (
    <div className="captain-page">
      <CaptainStatusBar
        phase={state.phase}
        timerSeconds={state.timerSeconds}
        timerRunning={state.timerRunning}
        connected={state.connected}
        bidStatus={state.bidStatus}
      />

      <CurrentPlayerCompact player={state.currentPlayer} />

      <BidStatusPanel
        currentBid={state.currentHighestBid}
        leadingTeam={state.currentHighestBidderTeamName}
        myMaxBid={state.myMaxBid}
        bidStatus={state.bidStatus}
      />

      <PurseAndSquad purse={state.myPurse} squadSize={state.mySquadSize} />

      {state.isPaused && (
        <div className="captain-paused-banner">Auction Paused — Please wait</div>
      )}

      <BiddingControls
        currentBid={state.currentHighestBid}
        maxBid={state.myMaxBid}
        canBid={state.canBid && !state.isPaused}
        phase={state.phase}
        isSending={state.isSending}
        onProposeBid={state.proposeBid}
      />

      {state.rejectionReason && (
        <div className="captain-toast--rejection">{state.rejectionReason}</div>
      )}

      {state.soldToast && (
        <div className={`captain-toast ${state.soldToast.won ? 'captain-toast--won' : 'captain-toast--info'}`}>
          {state.soldToast.message}
        </div>
      )}
    </div>
  );
}
