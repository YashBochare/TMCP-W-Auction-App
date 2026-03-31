import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ClientRole,
} from '@auction/shared';
import { addClient, removeClient, getClient, getClientsByRole } from './clientRegistry.js';
import { stateMachine } from '../auction/stateMachine.js';
import { getAllTeamConstraints, validateTeamBid } from '../auction/constraintService.js';
import { bidQueue } from '../auction/bidQueue.js';
import { auctionTimer } from '../auction/auctionTimer.js';
import { getTimerState } from '../auction/timerState.js';
import { getPrisma } from '../lib/prisma.js';

const VALID_ROLES: ClientRole[] = ['auctioneer', 'captain', 'viewer'];

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
let _io: TypedServer;

export function getIo(): TypedServer {
  return _io;
}

export function setupSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
  });
  _io = io;

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Welcome
    socket.emit('server:welcome', { serverTime: Date.now() });

    // Registration handshake
    socket.on('client:register', (data) => {
      if (!data?.role || !VALID_ROLES.includes(data.role)) {
        socket.emit('server:registered', {
          success: false,
          socketId: socket.id,
          error: 'Invalid role',
        });
        return;
      }

      // Leave previous room if re-registering
      const previousRooms = [...socket.rooms].filter((r) => r.startsWith('room:'));
      for (const room of previousRooms) {
        socket.leave(room);
      }

      addClient(socket.id, data.role, data.teamId);

      const roomName =
        data.role === 'captain'
          ? 'room:captains'
          : data.role === 'auctioneer'
            ? 'room:auctioneer'
            : 'room:viewers';
      socket.join(roomName);

      console.log(`[WS] Client registered: ${socket.id} as ${data.role}${data.teamId ? ` (team: ${data.teamId})` : ''}`);

      socket.emit('server:registered', {
        success: true,
        role: data.role,
        socketId: socket.id,
      });
    });

    // Ping/pong heartbeat
    socket.on('client:ping', (data) => {
      socket.emit('server:pong', {
        serverTime: Date.now(),
        clientTime: data.clientTime,
      });
    });

    // State sync — returns real auction state + constraints
    socket.on('client:requestState', async () => {
      try {
        const constraints = await getAllTeamConstraints();
        socket.emit('server:stateSync', { ...stateMachine.getState(getTimerState()), constraints });
      } catch (err) {
        console.error('[WS] stateSync constraint fetch failed:', err);
        socket.emit('server:stateSync', stateMachine.getState(getTimerState()));
      }
    });

    // === Auction commands (auctioneer only) ===

    function isAuctioneer(): boolean {
      const client = getClient(socket.id);
      return client?.role === 'auctioneer';
    }

    socket.on('auction:nextPlayer', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        const player = await stateMachine.nextPlayer();
        auctionTimer.stop();
        bidQueue.clearQueue();
        const constraints = await getAllTeamConstraints();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
        io.emit('auction:playerPresented', { player: player as any });
        io.emit('auction:constraintsUpdated', { constraints });
        io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: [] });
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:openBidding', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        await stateMachine.openBidding();
        auctionTimer.start();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:closeBidding', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        await stateMachine.closeBidding();
        auctionTimer.stop();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:sell', async (data) => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        const result = await stateMachine.sell(data.teamId);
        auctionTimer.stop();
        bidQueue.clearQueue();
        const constraints = await getAllTeamConstraints();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
        io.emit('auction:sold', result);
        io.emit('auction:constraintsUpdated', { constraints });
        io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: [] });
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:markUnsold', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        const result = await stateMachine.markUnsold();
        auctionTimer.stop();
        bidQueue.clearQueue();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
        io.emit('auction:unsold', result);
        io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: [] });
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    // === Pause/Resume ===

    socket.on('auctioneer:pauseAuction', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can pause' }); return; }
      try {
        await stateMachine.pause();
        auctionTimer.pause();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auctioneer:resumeAuction', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can resume' }); return; }
      try {
        await stateMachine.resume();
        auctionTimer.resume();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    // === Recall unsold players ===

    socket.on('auctioneer:recallUnsold', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can recall unsold players' }); return; }
      if (stateMachine.phase !== 'idle') { socket.emit('auction:error', { message: 'Cannot recall unsold players while auction is active' }); return; }
      try {
        const prisma = getPrisma();
        const result = await prisma.player.updateMany({ where: { status: 'UNSOLD' }, data: { status: 'PENDING' } });
        if (result.count === 0) { socket.emit('auction:error', { message: 'No unsold players to recall' }); return; }
        io.emit('auction:rosterRefreshed');
      } catch (err: any) {
        console.error('[WS] Recall unsold error:', err);
        socket.emit('auction:error', { message: 'Failed to recall unsold players' });
      }
    });

    // === Auctioneer bid acceptance ===

    socket.on('auctioneer:acceptBid', async (data) => {
      try {
        if (!isAuctioneer()) {
          socket.emit('auction:error', { message: 'Only the auctioneer can accept bids' });
          return;
        }

        const proposal = bidQueue.getProposalById(data.proposalId);
        if (!proposal) {
          socket.emit('auction:error', { message: 'Proposal not found or already processed' });
          return;
        }

        const previousHighestBidderTeamId = stateMachine.currentHighestBidderTeamId;

        await stateMachine.acceptBid(proposal.teamId, proposal.bidAmount);
        if (auctionTimer.isRunning()) { auctionTimer.reset(); }

        // Remove accepted proposal, capture and clear lower proposals
        bidQueue.removeProposal(proposal.id);
        const toBeClearedProposals = bidQueue.getProposals().filter(p => p.bidAmount <= proposal.bidAmount);
        const clearedTeamIds = toBeClearedProposals.map(p => p.teamId);
        bidQueue.clearLowerProposals(proposal.bidAmount);

        // Broadcast to ALL clients
        const playerName = stateMachine.currentPlayer?.name || 'Unknown';
        io.emit('auction:bidAccepted', { teamId: proposal.teamId, teamName: proposal.teamName, bidAmount: proposal.bidAmount, playerName });
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));

        // Update auctioneer's queue
        io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: bidQueue.getProposals() });

        // Notify winning captain
        const allCaptains = getClientsByRole('captain');
        const winningCaptain = allCaptains.find(c => c.teamId === proposal.teamId);
        if (winningCaptain) {
          io.to(winningCaptain.socketId).emit('captain:highestBidder', { bidAmount: proposal.bidAmount });
        }

        // Notify ALL cleared captains
        for (const clearedTeamId of clearedTeamIds) {
          if (clearedTeamId === proposal.teamId) continue;
          const clearedCaptain = allCaptains.find(c => c.teamId === clearedTeamId);
          if (clearedCaptain) {
            io.to(clearedCaptain.socketId).emit('captain:outbid', { newHighestBid: proposal.bidAmount, newLeadingTeam: proposal.teamName });
          }
        }

        // Notify previous highest bidder if not already in cleared list
        if (previousHighestBidderTeamId && previousHighestBidderTeamId !== proposal.teamId && !clearedTeamIds.includes(previousHighestBidderTeamId)) {
          const outbidCaptain = allCaptains.find(c => c.teamId === previousHighestBidderTeamId);
          if (outbidCaptain) {
            io.to(outbidCaptain.socketId).emit('captain:outbid', { newHighestBid: proposal.bidAmount, newLeadingTeam: proposal.teamName });
          }
        }
      } catch (err: any) {
        console.error('[WS] Bid acceptance error:', err);
        socket.emit('auction:error', { message: err.message || 'Failed to accept bid' });
      }
    });

    // === Auctioneer force accept bid (Story 5.3) ===

    socket.on('auctioneer:forceAcceptBid', async (data) => {
      try {
        if (!isAuctioneer()) {
          socket.emit('auction:error', { message: 'Only the auctioneer can force-accept bids' });
          return;
        }

        const phase = stateMachine.phase;
        if (phase !== 'bidding_open' && phase !== 'bidding_closed') {
          socket.emit('auction:error', { message: 'Cannot force a bid outside of bidding phases' });
          return;
        }

        // Retrieve team name
        const team = await getPrisma().team.findUnique({ where: { id: data.teamId }, select: { name: true } });
        if (!team) {
          socket.emit('auction:error', { message: 'Team not found' });
          return;
        }

        // Validate via constraint engine (bypass the "must exceed current bid" check)
        const validationResult = await validateTeamBid(data.teamId, data.bidAmount, data.bidAmount - 1);
        if (!validationResult.valid) {
          socket.emit('auction:error', { message: validationResult.reason || 'Bid validation failed' });
          return;
        }

        const previousHighestBidderTeamId = stateMachine.currentHighestBidderTeamId;

        await stateMachine.acceptBid(data.teamId, data.bidAmount);
        if (auctionTimer.isRunning()) { auctionTimer.reset(); }

        // Clear lower proposals from the queue
        bidQueue.clearLowerProposals(data.bidAmount);

        // Broadcast to ALL clients
        const playerName = stateMachine.currentPlayer?.name || 'Unknown';
        io.emit('auction:bidAccepted', { teamId: data.teamId, teamName: team.name, bidAmount: data.bidAmount, playerName });
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));

        // Update auctioneer's queue
        io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: bidQueue.getProposals() });

        // Notify winning captain
        const allCaptains = getClientsByRole('captain');
        const winningCaptain = allCaptains.find(c => c.teamId === data.teamId);
        if (winningCaptain) {
          io.to(winningCaptain.socketId).emit('captain:highestBidder', { bidAmount: data.bidAmount });
        }

        // Notify previous highest bidder
        if (previousHighestBidderTeamId && previousHighestBidderTeamId !== data.teamId) {
          const outbidCaptain = allCaptains.find(c => c.teamId === previousHighestBidderTeamId);
          if (outbidCaptain) {
            io.to(outbidCaptain.socketId).emit('captain:outbid', { newHighestBid: data.bidAmount, newLeadingTeam: team.name });
          }
        }
      } catch (err: any) {
        console.error('[WS] Force accept bid error:', err);
        socket.emit('auction:error', { message: err.message || 'Failed to force-accept bid' });
      }
    });

    // === Captain bid proposal ===

    socket.on('captain:proposeBid', async (data) => {
      try {
        const client = getClient(socket.id);
        if (!client || client.role !== 'captain') {
          socket.emit('captain:bidStatus', { status: 'rejected', reason: 'Only captains can propose bids', bidAmount: data.bidAmount });
          return;
        }
        if (stateMachine.phase !== 'bidding_open') {
          socket.emit('captain:bidStatus', { status: 'rejected', reason: 'Bidding is not currently open', bidAmount: data.bidAmount });
          return;
        }
        if (stateMachine.isPaused) {
          socket.emit('captain:bidStatus', { status: 'rejected', reason: 'Auction is currently paused', bidAmount: data.bidAmount });
          return;
        }
        if (typeof data.bidAmount !== 'number' || !Number.isFinite(data.bidAmount) || data.bidAmount <= 0 || !Number.isInteger(data.bidAmount)) {
          socket.emit('captain:bidStatus', { status: 'rejected', reason: 'Bid amount must be a positive integer', bidAmount: data.bidAmount });
          return;
        }
        const teamId = client.teamId;
        if (!teamId) {
          socket.emit('captain:bidStatus', { status: 'rejected', reason: 'Captain not associated with a team', bidAmount: data.bidAmount });
          return;
        }

        // Fetch team name from DB
        const team = await getPrisma().team.findUnique({ where: { id: teamId }, select: { name: true } });
        if (!team) {
          socket.emit('captain:bidStatus', { status: 'rejected', reason: 'Team not found', bidAmount: data.bidAmount });
          return;
        }

        // Validate via constraint engine
        const result = await validateTeamBid(teamId, data.bidAmount, stateMachine.currentHighestBid);
        if (!result.valid) {
          socket.emit('captain:bidStatus', { status: 'rejected', reason: result.reason, bidAmount: data.bidAmount });
          return;
        }

        // Replace existing proposal from this team
        bidQueue.removeTeamProposal(teamId);
        const proposal = bidQueue.addProposal(teamId, team.name, data.bidAmount);

        // Respond to captain
        socket.emit('captain:bidStatus', { status: 'proposed', bidAmount: data.bidAmount });

        // Broadcast to auctioneer ONLY
        io.to('room:auctioneer').emit('auction:bidProposed', { proposal });
        io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: bidQueue.getProposals() });
      } catch (err) {
        console.error('[WS] Bid proposal error:', err);
        socket.emit('captain:bidStatus', { status: 'error', reason: 'Server error processing bid', bidAmount: data.bidAmount });
      }
    });

    // === Undo last action (Story 5.2) ===

    socket.on('auctioneer:undoLastAction', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can undo actions' }); return; }
      try {
        const { undoneType } = await stateMachine.undo();
        bidQueue.clearQueue();
        const constraints = await getAllTeamConstraints();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
        if (undoneType === 'SOLD' || undoneType === 'UNSOLD') {
          io.emit('auction:constraintsUpdated', { constraints });
        }
        io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: bidQueue.getProposals() });
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      removeClient(socket.id);
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}
