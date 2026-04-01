import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, ClientRole } from '@auction/shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(): TypedSocket {
  // In production (same-origin), connect to current host. In dev, use API URL or localhost.
  const url = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : undefined);
  return io(url ?? window.location.origin, {
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
