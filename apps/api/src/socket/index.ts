import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ClientRole,
} from '@auction/shared';
import { addClient, removeClient, getClient } from './clientRegistry.js';
import { stateMachine } from '../auction/stateMachine.js';

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

    // State sync — returns real auction state
    socket.on('client:requestState', () => {
      socket.emit('server:stateSync', stateMachine.getState());
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
        io.emit('auction:stateChanged', stateMachine.getState());
        io.emit('auction:playerPresented', { player: player as any });
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:openBidding', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        await stateMachine.openBidding();
        io.emit('auction:stateChanged', stateMachine.getState());
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:closeBidding', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        await stateMachine.closeBidding();
        io.emit('auction:stateChanged', stateMachine.getState());
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:sell', async (data) => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        const result = await stateMachine.sell(data.teamId);
        io.emit('auction:stateChanged', stateMachine.getState());
        io.emit('auction:sold', result);
      } catch (err: any) {
        socket.emit('auction:error', { message: err.message });
      }
    });

    socket.on('auction:markUnsold', async () => {
      if (!isAuctioneer()) { socket.emit('auction:error', { message: 'Only auctioneer can control the auction' }); return; }
      try {
        const result = await stateMachine.markUnsold();
        io.emit('auction:stateChanged', stateMachine.getState());
        io.emit('auction:unsold', result);
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
