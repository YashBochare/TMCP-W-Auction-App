import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ClientRole,
} from '@auction/shared';
import { getNextBid } from '@auction/shared';
import { addClient, removeClient, getClient } from './clientRegistry.js';
import { stateMachine } from '../auction/stateMachine.js';
import { getAllTeamConstraints, getTeamConstraints } from '../auction/constraintService.js';
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
      origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174'],
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
        const constraints = await getAllTeamConstraints();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
        io.emit('auction:playerPresented', { player: player as any });
        io.emit('auction:constraintsUpdated', { constraints });
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:openBidding', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        await stateMachine.openBidding();
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
        const constraints = await getAllTeamConstraints();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
        io.emit('auction:sold', result);
        io.emit('auction:constraintsUpdated', { constraints });
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:markUnsold', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        const result = await stateMachine.markUnsold();
        auctionTimer.stop();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
        io.emit('auction:unsold', result);
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

    // === Register bid (physical bidding model) ===

    socket.on('auctioneer:registerBid', async (data) => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can register bids' }); return; }
      if (stateMachine.phase !== 'bidding_open') { socket.emit('auction:error', { message: 'Bidding is not open' }); return; }
      if (stateMachine.isPaused) { socket.emit('auction:error', { message: 'Auction is paused' }); return; }
      if (!stateMachine.currentPlayer) { socket.emit('auction:error', { message: 'No current player' }); return; }
      if (data.teamId === stateMachine.currentHighestBidderTeamId) { socket.emit('auction:error', { message: 'Team is already the highest bidder' }); return; }

      try {
        const nextBid = getNextBid(stateMachine.currentHighestBid, stateMachine.currentPlayer.basePrice);

        // Validate team can afford
        const teamConstraints = await getTeamConstraints(data.teamId);
        if (!teamConstraints.canBid) { socket.emit('auction:error', { message: 'Team cannot bid (squad full or no purse)' }); return; }
        if (nextBid > teamConstraints.maxBid) { socket.emit('auction:error', { message: `Team purse insufficient for bid of ${nextBid}` }); return; }

        await stateMachine.acceptBid(data.teamId, nextBid);

        const team = await getPrisma().team.findUnique({ where: { id: data.teamId }, select: { name: true } });
        const teamName = team?.name || 'Unknown';

        io.emit('auction:bidRegistered', { teamId: data.teamId, teamName, bidAmount: nextBid });
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
        const constraints = await getAllTeamConstraints();
        io.emit('auction:constraintsUpdated', { constraints });
      } catch (err: any) {
        console.error('[WS] Register bid error:', err);
        socket.emit('auction:error', { message: 'Failed to register bid' });
      }
    });

    // === Undo last action (Story 5.2) ===

    socket.on('auctioneer:undoLastAction', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can undo actions' }); return; }
      try {
        await stateMachine.undo();
        const constraints = await getAllTeamConstraints();
        io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
        io.emit('auction:constraintsUpdated', { constraints });
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
