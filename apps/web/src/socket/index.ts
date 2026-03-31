import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, ClientRole } from '@auction/shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(): TypedSocket {
  return io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    autoConnect: false,
  });
}

export function connectAndRegister(
  socket: TypedSocket,
  role: ClientRole,
  teamId?: string,
  token?: string
) {
  // Attach listeners before connect to avoid race
  socket.on('connect', () => {
    socket.emit('client:register', { role, teamId, token });
  });

  // Re-register + request state on reconnect
  socket.io.on('reconnect', () => {
    socket.emit('client:register', { role, teamId, token });
    socket.emit('client:requestState');
  });

  socket.connect();
}
