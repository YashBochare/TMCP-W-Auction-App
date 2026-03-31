import { useEffect, useState, useCallback, useRef } from 'react';
import type { BidProposal, Player } from '@auction/shared';
import { useAuctionState } from './useAuctionState';

interface AuctioneerExtras {
  proposals: BidProposal[];
  players: Player[];
  isProcessing: boolean;
  actionError: string | null;
}

export function useAuctioneerState(token?: string) {
  const base = useAuctionState('auctioneer', undefined, token);

  const [extras, setExtras] = useState<AuctioneerExtras>({
    proposals: [],
    players: [],
    isProcessing: false,
    actionError: null,
  });

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Track mounted state for safe async updates
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Track currentPlayer.id for sold/unsold correlation
  useEffect(() => {
    if (base.currentPlayer) {
      currentPlayerIdRef.current = base.currentPlayer.id;
    }
  }, [base.currentPlayer]);

  // P2: Clear proposals when phase transitions to idle or player_presented (new player)
  useEffect(() => {
    if (base.phase === 'idle' || base.phase === 'player_presented') {
      setExtras(s => s.proposals.length > 0 ? { ...s, proposals: [] } : s);
    }
  }, [base.phase]);

  // Listen for auctioneer-specific WebSocket events
  useEffect(() => {
    const socket = base.socket.current;
    if (!socket) return;

    const handleBidProposalQueued = (data: { proposals: BidProposal[] }) => {
      setExtras(s => ({ ...s, proposals: data.proposals }));
    };

    const handleBidProposed = (data: { proposal: BidProposal }) => {
      setExtras(s => {
        const exists = s.proposals.some(p => p.id === data.proposal.id);
        if (exists) return s;
        return { ...s, proposals: [...s.proposals, data.proposal].sort((a, b) => b.bidAmount - a.bidAmount) };
      });
    };

    const handleError = (data: { message: string }) => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      setExtras(s => ({ ...s, actionError: data.message, isProcessing: false }));
      errorTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setExtras(s => ({ ...s, actionError: null }));
      }, 3000);
    };

    // P5: Use base hook's soldOverlay/unsoldOverlay instead of duplicate overlay system.
    // P1: No more untracked overlay timers — base hook handles overlay timers with refs.
    const handleSold = () => {
      const playerId = currentPlayerIdRef.current;
      setExtras(s => ({
        ...s,
        isProcessing: false,
        players: playerId
          ? s.players.map(p => p.id === playerId ? { ...p, status: 'SOLD' as const } : p)
          : s.players,
      }));
    };

    const handleUnsold = () => {
      const playerId = currentPlayerIdRef.current;
      setExtras(s => ({
        ...s,
        isProcessing: false,
        players: playerId
          ? s.players.map(p => p.id === playerId ? { ...p, status: 'UNSOLD' as const } : p)
          : s.players,
      }));
    };

    socket.on('auction:bidProposalQueued', handleBidProposalQueued);
    socket.on('auction:bidProposed', handleBidProposed);
    socket.on('auction:error', handleError);
    const handleRosterRefreshed = () => {
      if (!token) return;
      fetch('/api/players', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.data && mountedRef.current) {
            setExtras(s => ({ ...s, players: data.data }));
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setExtras(s => ({ ...s, actionError: 'Failed to refresh player list' }));
          }
        });
    };

    socket.on('auction:sold', handleSold);
    socket.on('auction:unsold', handleUnsold);
    socket.on('auction:rosterRefreshed', handleRosterRefreshed);

    return () => {
      socket.off('auction:bidProposalQueued', handleBidProposalQueued);
      socket.off('auction:bidProposed', handleBidProposed);
      socket.off('auction:error', handleError);
      socket.off('auction:sold', handleSold);
      socket.off('auction:unsold', handleUnsold);
      socket.off('auction:rosterRefreshed', handleRosterRefreshed);
    };
  }, [base.socket]);

  // P6: Fetch player list with AbortController
  useEffect(() => {
    if (!base.connected || !token) return;
    const controller = new AbortController();
    fetch('/api/players', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data && mountedRef.current) {
          setExtras(s => ({ ...s, players: data.data }));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [base.connected, token]);

  // P6: Fetch proposals with AbortController
  useEffect(() => {
    if (!base.connected || !token) return;
    const controller = new AbortController();
    fetch('/api/auction/proposals', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data?.proposals && mountedRef.current) {
          setExtras(s => ({ ...s, proposals: data.data.proposals }));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [base.connected, token]);

  // P3: withProcessing uses only event-driven reset + safety net that cancels properly
  const withProcessing = useCallback((fn: () => void) => {
    setExtras(s => ({ ...s, isProcessing: true }));
    fn();
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    processingTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setExtras(s => ({ ...s, isProcessing: false }));
    }, 5000);
  }, []);

  // P3: Clear processing on state changes AND cancel the safety net timer
  useEffect(() => {
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    setExtras(s => s.isProcessing ? { ...s, isProcessing: false } : s);
  }, [base.phase, base.currentHighestBid, base.currentPlayer]);

  // P8: Capture teamId in a ref so sell() closure is never stale
  const highestBidderRef = useRef(base.currentHighestBidderTeamId);
  useEffect(() => {
    highestBidderRef.current = base.currentHighestBidderTeamId;
  }, [base.currentHighestBidderTeamId]);

  const actions = {
    nextPlayer: useCallback(() => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auction:nextPlayer'));
    }, [base.socket, withProcessing]),

    openBidding: useCallback(() => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auction:openBidding'));
    }, [base.socket, withProcessing]),

    closeBidding: useCallback(() => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auction:closeBidding'));
    }, [base.socket, withProcessing]),

    acceptBid: useCallback((proposalId: string) => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auctioneer:acceptBid', { proposalId }));
    }, [base.socket, withProcessing]),

    sell: useCallback(() => {
      const socket = base.socket.current;
      const teamId = highestBidderRef.current;
      if (!socket || !teamId) return;
      withProcessing(() => socket.emit('auction:sell', { teamId }));
    }, [base.socket, withProcessing]),

    markUnsold: useCallback(() => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auction:markUnsold'));
    }, [base.socket, withProcessing]),

    recallUnsold: useCallback(() => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auctioneer:recallUnsold'));
    }, [base.socket, withProcessing]),

    forceAcceptBid: useCallback((teamId: string, bidAmount: number) => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auctioneer:forceAcceptBid', { teamId, bidAmount }));
    }, [base.socket, withProcessing]),

    pause: useCallback(() => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auctioneer:pauseAuction'));
    }, [base.socket, withProcessing]),

    resume: useCallback(() => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auctioneer:resumeAuction'));
    }, [base.socket, withProcessing]),

    undoLastAction: useCallback(() => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auctioneer:undoLastAction'));
    }, [base.socket, withProcessing]),

    refreshPlayers: useCallback(() => {
      if (!token) return;
      fetch('/api/players', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.data && mountedRef.current) {
            setExtras(s => ({ ...s, players: data.data }));
          }
        })
        .catch(() => {});
    }, [token]),
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    };
  }, []);

  // P5: Use base hook's overlay (single source of truth) instead of extras
  return {
    ...base,
    proposals: extras.proposals,
    players: extras.players,
    isProcessing: extras.isProcessing,
    actionError: extras.actionError,
    actions,
  };
}
