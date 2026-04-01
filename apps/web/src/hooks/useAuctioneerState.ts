import { useEffect, useState, useCallback, useRef } from 'react';
import type { Player } from '@auction/shared';
import { useAuctionState } from './useAuctionState';

interface AuctioneerExtras {
  players: Player[];
  teamColors: Record<string, string>;
  isProcessing: boolean;
  actionError: string | null;
}

export function useAuctioneerState(token?: string) {
  const base = useAuctionState('auctioneer', undefined, token);

  const [extras, setExtras] = useState<AuctioneerExtras>({
    players: [],
    teamColors: {},
    isProcessing: false,
    actionError: null,
  });

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (base.currentPlayer) {
      currentPlayerIdRef.current = base.currentPlayer.id;
    }
  }, [base.currentPlayer]);

  // Listen for auctioneer-specific WebSocket events
  useEffect(() => {
    const socket = base.socket.current;
    if (!socket) return;

    const handleError = (data: { message: string }) => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      setExtras(s => ({ ...s, actionError: data.message, isProcessing: false }));
      errorTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setExtras(s => ({ ...s, actionError: null }));
      }, 3000);
    };

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

    const handleRosterRefreshed = () => {
      if (!token) return;
      fetch('/api/players', { headers: { Authorization: `Bearer ${token}` } })
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

    socket.on('auction:error', handleError);
    socket.on('auction:sold', handleSold);
    socket.on('auction:unsold', handleUnsold);
    socket.on('auction:rosterRefreshed', handleRosterRefreshed);

    return () => {
      socket.off('auction:error', handleError);
      socket.off('auction:sold', handleSold);
      socket.off('auction:unsold', handleUnsold);
      socket.off('auction:rosterRefreshed', handleRosterRefreshed);
    };
  }, [base.socket, token]);

  // Fetch player list and team colors on connect
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

    fetch('/api/teams', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data && mountedRef.current) {
          const colors: Record<string, string> = {};
          for (const t of data.data) { colors[t.id] = t.colorCode; }
          setExtras(s => ({ ...s, teamColors: colors }));
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [base.connected, token]);

  const withProcessing = useCallback((fn: () => void) => {
    setExtras(s => ({ ...s, isProcessing: true }));
    fn();
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    processingTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setExtras(s => ({ ...s, isProcessing: false }));
    }, 5000);
  }, []);

  // Clear processing on state changes
  useEffect(() => {
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    setExtras(s => s.isProcessing ? { ...s, isProcessing: false } : s);
  }, [base.phase, base.currentHighestBid, base.currentPlayer]);

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

    registerBid: useCallback((teamId: string) => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auctioneer:registerBid', { teamId }));
    }, [base.socket, withProcessing]),

    recallUnsold: useCallback(() => {
      const socket = base.socket.current;
      if (!socket) return;
      withProcessing(() => socket.emit('auctioneer:recallUnsold'));
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
      fetch('/api/players', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.data && mountedRef.current) {
            setExtras(s => ({ ...s, players: data.data }));
          }
        })
        .catch(() => {});
    }, [token]),
  };

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    };
  }, []);

  return {
    ...base,
    players: extras.players,
    teamColors: extras.teamColors,
    isProcessing: extras.isProcessing,
    actionError: extras.actionError,
    actions,
  };
}
