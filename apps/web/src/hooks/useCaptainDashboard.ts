import { useEffect, useState, useRef } from 'react';
import type { Player, TeamBidConstraints } from '@auction/shared';
import { useAuctionState } from './useAuctionState';

interface CaptainDashboardState {
  teamName: string;
  teamColor: string;
  purse: number;
  squadSize: number;
  maxSquadSize: number;
  myPlayers: Player[];
}

export function useCaptainDashboard(teamId?: string, token?: string) {
  const base = useAuctionState('captain', teamId, token);
  const mountedRef = useRef(true);

  const [dashboard, setDashboard] = useState<CaptainDashboardState>({
    teamName: '',
    teamColor: '#888',
    purse: 0,
    squadSize: 0,
    maxSquadSize: 7,
    myPlayers: [],
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Update purse/squad from constraints
  useEffect(() => {
    if (!teamId || base.teams.length === 0) return;
    const myTeam = base.teams.find((t: TeamBidConstraints) => t.teamId === teamId);
    if (myTeam) {
      setDashboard(s => ({
        ...s,
        teamName: myTeam.teamName,
        purse: myTeam.currentPurse,
        squadSize: myTeam.currentSquadSize,
      }));
    }
  }, [base.teams, teamId]);

  // Fetch event config for maxSquadSize
  useEffect(() => {
    if (!base.connected) return;
    const controller = new AbortController();
    fetch('/api/event-config', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data?.maxSquadSize && mountedRef.current) {
          setDashboard(s => ({ ...s, maxSquadSize: data.data.maxSquadSize }));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [base.connected]);

  // Fetch team info (color) and players on connect
  useEffect(() => {
    if (!base.connected || !teamId || !token) return;
    const controller = new AbortController();

    // Fetch team details for color
    fetch(`/api/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data && mountedRef.current) {
          setDashboard(s => ({
            ...s,
            teamName: data.data.name || s.teamName,
            teamColor: data.data.colorCode || s.teamColor,
          }));
        }
      })
      .catch(() => {});

    // Fetch players for this team
    fetchMyPlayers(token, controller.signal);

    return () => controller.abort();
  }, [base.connected, teamId, token]);

  // Refresh player list when a player is sold (might be sold to our team)
  useEffect(() => {
    const socket = base.socket.current;
    if (!socket || !token) return;

    const handleSold = () => {
      fetchMyPlayers(token);
    };

    socket.on('auction:sold', handleSold);
    return () => { socket.off('auction:sold', handleSold); };
  }, [base.socket, token]);

  function fetchMyPlayers(authToken: string, signal?: AbortSignal) {
    fetch('/api/players', {
      headers: { Authorization: `Bearer ${authToken}` },
      signal,
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data && mountedRef.current) {
          const mine = (data.data as Player[]).filter(p => p.teamId === teamId && p.status === 'SOLD');
          setDashboard(s => ({ ...s, myPlayers: mine }));
        }
      })
      .catch(() => {});
  }

  return {
    ...base,
    teamName: dashboard.teamName,
    teamColor: dashboard.teamColor,
    purse: dashboard.purse,
    squadSize: dashboard.squadSize,
    maxSquadSize: dashboard.maxSquadSize,
    myPlayers: dashboard.myPlayers,
  };
}
