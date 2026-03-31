import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuctionState } from './useAuctionState';
import { useAuth } from '../context/AuthContext';

type BidStatus = 'waiting' | 'proposed' | 'highest_bidder' | 'outbid' | 'insufficient' | 'squad_full';

export function useCaptainBidding() {
  const { user } = useAuth();
  const teamId = user?.teamId;
  const token = user?.token;

  const auction = useAuctionState('captain', teamId, token);
  const socketRef = auction.socket;

  const [bidStatus, setBidStatus] = useState<BidStatus>('waiting');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [soldToast, setSoldToast] = useState<{ message: string; won: boolean } | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Derive captain-specific constraints
  const myConstraints = auction.teams.find(t => t.teamId === teamId);
  const myPurse = myConstraints?.currentPurse ?? 0;
  const mySquadSize = myConstraints?.currentSquadSize ?? 0;
  const myMaxBid = myConstraints?.maxBid ?? 0;
  const canBid = myConstraints?.canBid ?? false;

  // Update bidStatus based on constraints (uses functional update to avoid self-dependency)
  useEffect(() => {
    if (!canBid && mySquadSize >= 7) {
      setBidStatus('squad_full');
    } else if (!canBid && myPurse > 0) {
      setBidStatus('insufficient');
    } else if (auction.phase !== 'bidding_open') {
      setBidStatus(prev => prev === 'highest_bidder' ? prev : 'waiting');
    }
  }, [canBid, mySquadSize, myPurse, auction.phase]);

  // Listen for captain-specific events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onBidStatus = (data: { status: string; reason?: string; bidAmount: number }) => {
      setIsSending(false);
      if (data.status === 'proposed') {
        setBidStatus('proposed');
      } else if (data.status === 'rejected') {
        setRejectionReason(data.reason ?? 'Bid rejected');
        const t = setTimeout(() => setRejectionReason(null), 3000);
        timersRef.current.push(t);
      }
    };

    const onHighestBidder = () => setBidStatus('highest_bidder');
    const onOutbid = () => setBidStatus('outbid');

    const onSold = (data: { playerName: string; teamName: string; soldPrice: number }) => {
      // Use bidStatus to determine if we won — avoids stale closure on auction state
      setBidStatus(prev => {
        const won = prev === 'highest_bidder';
        setSoldToast({ message: won ? `YOU WON ${data.playerName}!` : `SOLD to ${data.teamName}`, won });
        return 'waiting';
      });
      const t = setTimeout(() => setSoldToast(null), 2500);
      timersRef.current.push(t);
    };

    const onUnsold = () => {
      setSoldToast({ message: 'UNSOLD', won: false });
      setBidStatus('waiting');
      const t = setTimeout(() => setSoldToast(null), 2000);
      timersRef.current.push(t);
    };

    socket.on('captain:bidStatus', onBidStatus as any);
    socket.on('captain:highestBidder', onHighestBidder as any);
    socket.on('captain:outbid', onOutbid as any);
    socket.on('auction:sold', onSold as any);
    socket.on('auction:unsold', onUnsold as any);

    return () => {
      socket.off('captain:bidStatus', onBidStatus as any);
      socket.off('captain:highestBidder', onHighestBidder as any);
      socket.off('captain:outbid', onOutbid as any);
      socket.off('auction:sold', onSold as any);
      socket.off('auction:unsold', onUnsold as any);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [socketRef, teamId]);

  const proposeBid = useCallback((amount: number) => {
    const socket = socketRef.current;
    if (!socket?.connected || isSending) return;
    setIsSending(true);
    socket.emit('captain:proposeBid', { bidAmount: amount });
    // Timeout fallback
    const t = setTimeout(() => setIsSending(false), 3000);
    timersRef.current.push(t);
  }, [socketRef, isSending]);

  return {
    ...auction,
    bidStatus,
    myPurse,
    mySquadSize,
    myMaxBid,
    canBid,
    rejectionReason,
    isSending,
    soldToast,
    proposeBid,
    teamName: user?.teamName ?? null,
  };
}
