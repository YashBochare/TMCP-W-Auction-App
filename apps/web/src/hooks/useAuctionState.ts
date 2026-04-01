import { useEffect, useRef, useState, useCallback } from 'react';
import type { AuctionPhase, Player, TeamBidConstraints, AuctionStateSyncPayload } from '@auction/shared';
import { createSocket, connectAndRegister } from '../socket';
import type { TypedSocket } from '../socket';

interface AuctionState {
  connected: boolean;
  phase: AuctionPhase;
  currentPlayer: Player | null;
  currentHighestBid: number;
  currentHighestBidderTeamId: string | null;
  currentHighestBidderTeamName: string | null;
  timerSeconds: number;
  timerRunning: boolean;
  timerExpired: boolean;
  isPaused: boolean;
  hasUndoHistory: boolean;
  teams: TeamBidConstraints[];
  soldOverlay: { playerName: string; teamName: string; soldPrice: number } | null;
  unsoldOverlay: { playerName: string } | null;
}

export function useAuctionState(role: 'viewer' | 'captain' | 'auctioneer' = 'viewer', teamId?: string, token?: string) {
  const [state, setState] = useState<AuctionState>({
    connected: false,
    phase: 'idle',
    currentPlayer: null,
    currentHighestBid: 0,
    currentHighestBidderTeamId: null,
    currentHighestBidderTeamName: null,
    timerSeconds: 20,
    timerRunning: false,
    timerExpired: false,
    isPaused: false,
    hasUndoHistory: false,
    teams: [],
    soldOverlay: null,
    unsoldOverlay: null,
  });

  const socketRef = useRef<TypedSocket | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const deriveTeamName = useCallback((teamId: string | null, teams: TeamBidConstraints[]): string | null => {
    if (!teamId) return null;
    return teams.find(t => t.teamId === teamId)?.teamName ?? null;
  }, []);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => setState(s => ({ ...s, connected: true })));
    socket.on('disconnect', () => setState(s => ({ ...s, connected: false })));

    // Full state sync (initial load + reconnection)
    socket.on('server:stateSync', (data: AuctionStateSyncPayload) => {
      setState(s => ({
        ...s,
        phase: data.phase,
        currentPlayer: data.currentPlayer,
        currentHighestBid: data.currentHighestBid,
        currentHighestBidderTeamId: data.currentHighestBidderTeamId,
        timerSeconds: data.timerSeconds,
        timerRunning: data.timerRunning,
        isPaused: data.isPaused,
        hasUndoHistory: data.hasUndoHistory ?? false,
        timerExpired: false,
        teams: data.constraints ?? s.teams,
        currentHighestBidderTeamName: deriveTeamName(data.currentHighestBidderTeamId, data.constraints ?? s.teams),
      }));
    });

    // Incremental state changes
    socket.on('auction:stateChanged', (data) => {
      setState(s => ({
        ...s,
        phase: data.phase,
        currentPlayer: data.currentPlayer,
        currentHighestBid: data.currentHighestBid,
        currentHighestBidderTeamId: data.currentHighestBidderTeamId,
        timerSeconds: data.timerSeconds,
        timerRunning: data.timerRunning,
        isPaused: data.isPaused,
        hasUndoHistory: data.hasUndoHistory ?? false,
        timerExpired: false,
        currentHighestBidderTeamName: deriveTeamName(data.currentHighestBidderTeamId, s.teams),
      }));
    });

    // Timer
    socket.on('auction:timerTick', ({ secondsRemaining }) => {
      setState(s => ({ ...s, timerSeconds: secondsRemaining, timerExpired: false }));
    });

    socket.on('auction:timerExpired', () => {
      setState(s => ({ ...s, timerSeconds: 0, timerRunning: false, timerExpired: true }));
    });

    // Constraints
    socket.on('auction:constraintsUpdated', ({ constraints }) => {
      setState(s => ({
        ...s,
        teams: constraints,
        currentHighestBidderTeamName: deriveTeamName(s.currentHighestBidderTeamId, constraints),
      }));
    });

    // Bid registered (physical bidding model)
    socket.on('auction:bidRegistered', (data) => {
      setState(s => ({
        ...s,
        currentHighestBid: data.bidAmount,
        currentHighestBidderTeamId: data.teamId,
        currentHighestBidderTeamName: data.teamName,
      }));
    });

    // Sold overlay
    socket.on('auction:sold', (data) => {
      setState(s => ({ ...s, soldOverlay: { playerName: data.playerName, teamName: data.teamName, soldPrice: data.soldPrice } }));
      timersRef.current.push(setTimeout(() => setState(s => ({ ...s, soldOverlay: null })), 3000));
    });

    // Unsold overlay
    socket.on('auction:unsold', (data) => {
      setState(s => ({ ...s, unsoldOverlay: { playerName: data.playerName } }));
      timersRef.current.push(setTimeout(() => setState(s => ({ ...s, unsoldOverlay: null })), 2000));
    });

    connectAndRegister(socket, role, teamId, token);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role, teamId, token, deriveTeamName]);

  return { ...state, socket: socketRef };
}
