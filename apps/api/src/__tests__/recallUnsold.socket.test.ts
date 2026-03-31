import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import express from 'express';
import { io as ioClient } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@auction/shared';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

// Mock Prisma — must be before importing socket setup
const mockUpdateMany = vi.fn();
vi.mock('../lib/prisma.js', () => ({
  getPrisma: () => ({
    player: {
      updateMany: mockUpdateMany,
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    team: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    auctionState: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  }),
}));

import { setupSocketServer } from '../socket/index.js';
import { stateMachine } from '../auction/stateMachine.js';

type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function waitForEvent<T>(socket: TypedClientSocket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    (socket as any).once(event, (data: T) => { clearTimeout(timer); resolve(data); });
  });
}

describe('WS auctioneer:recallUnsold handler', () => {
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  function createClient(): TypedClientSocket {
    return ioClient(`http://localhost:${port}`, { autoConnect: false, reconnection: false });
  }

  beforeAll(() => new Promise<void>((resolve) => {
    const app = express();
    httpServer = createServer(app);
    setupSocketServer(httpServer);
    httpServer.listen(0, () => { port = (httpServer.address() as any).port; resolve(); });
  }));

  afterAll(() => new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  }), 15000);

  beforeEach(() => {
    vi.clearAllMocks();
    stateMachine.phase = 'idle';
    stateMachine.currentPlayer = null;
  });

  it('rejects recall from non-auctioneer', async () => {
    const client = createClient();
    await waitForEvent(client.connect(), 'server:welcome');

    const regPromise = waitForEvent(client, 'server:registered');
    client.emit('client:register', { role: 'viewer' });
    await regPromise;

    const errorPromise = waitForEvent<{ message: string }>(client, 'auction:error');
    client.emit('auctioneer:recallUnsold');
    const err = await errorPromise;

    expect(err.message).toContain('Only auctioneer');
    client.disconnect();
  });

  it('rejects recall when phase is not idle', async () => {
    stateMachine.phase = 'bidding_open';

    const client = createClient();
    await waitForEvent(client.connect(), 'server:welcome');

    const regPromise = waitForEvent(client, 'server:registered');
    client.emit('client:register', { role: 'auctioneer' });
    await regPromise;

    const errorPromise = waitForEvent<{ message: string }>(client, 'auction:error');
    client.emit('auctioneer:recallUnsold');
    const err = await errorPromise;

    expect(err.message).toContain('Cannot recall');
    expect(mockUpdateMany).not.toHaveBeenCalled();
    client.disconnect();
  });

  it('emits rosterRefreshed on successful recall', async () => {
    mockUpdateMany.mockResolvedValue({ count: 2 });

    const client = createClient();
    await waitForEvent(client.connect(), 'server:welcome');

    const regPromise = waitForEvent(client, 'server:registered');
    client.emit('client:register', { role: 'auctioneer' });
    await regPromise;

    const refreshPromise = waitForEvent(client, 'auction:rosterRefreshed');
    client.emit('auctioneer:recallUnsold');
    await refreshPromise;

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { status: 'UNSOLD' },
      data: { status: 'PENDING' },
    });
    client.disconnect();
  });

  it('does not leak internal error messages on DB failure', async () => {
    mockUpdateMany.mockRejectedValue(new Error('Connection refused to postgresql://secret:pass@db'));

    const client = createClient();
    await waitForEvent(client.connect(), 'server:welcome');

    const regPromise = waitForEvent(client, 'server:registered');
    client.emit('client:register', { role: 'auctioneer' });
    await regPromise;

    const errorPromise = waitForEvent<{ message: string }>(client, 'auction:error');
    client.emit('auctioneer:recallUnsold');
    const err = await errorPromise;

    expect(err.message).toBe('Failed to recall unsold players');
    expect(err.message).not.toContain('postgresql');
    client.disconnect();
  });
});
