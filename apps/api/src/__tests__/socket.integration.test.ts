import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import express from 'express';
import { io as ioClient } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@auction/shared';

// Set env vars before importing
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import { setupSocketServer } from '../socket/index.js';
import { getAllClients } from '../socket/clientRegistry.js';

type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: ReturnType<typeof createServer>;
let port: number;

function createClient(): TypedClientSocket {
  return ioClient(`http://localhost:${port}`, {
    autoConnect: false,
    reconnection: false,
  });
}

function waitForEvent<T>(socket: TypedClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    (socket as any).once(event, (data: T) => resolve(data));
  });
}

describe('WebSocket integration', () => {
  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        const app = express();
        httpServer = createServer(app);
        setupSocketServer(httpServer);
        httpServer.listen(0, () => {
          port = (httpServer.address() as any).port;
          resolve();
        });
      })
  );

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      })
  );

  it('receives server:welcome on connection', async () => {
    const client = createClient();
    const welcomePromise = waitForEvent<{ serverTime: number }>(client, 'server:welcome');
    client.connect();
    const data = await welcomePromise;
    expect(data.serverTime).toBeTypeOf('number');
    client.disconnect();
  });

  it('client:register -> server:registered handshake', async () => {
    const client = createClient();
    const welcomePromise = waitForEvent(client, 'server:welcome');
    client.connect();
    await welcomePromise;

    const registeredPromise = waitForEvent<{ success: boolean; role: string; socketId: string }>(
      client,
      'server:registered'
    );
    client.emit('client:register', { role: 'viewer' });
    const data = await registeredPromise;

    expect(data.success).toBe(true);
    expect(data.role).toBe('viewer');
    expect(data.socketId).toBeTruthy();
    client.disconnect();
  });

  it('client:ping -> server:pong round-trip', async () => {
    const client = createClient();
    const welcomePromise = waitForEvent(client, 'server:welcome');
    client.connect();
    await welcomePromise;

    const clientTime = Date.now();
    const pongPromise = waitForEvent<{ serverTime: number; clientTime: number }>(
      client,
      'server:pong'
    );
    client.emit('client:ping', { clientTime });
    const data = await pongPromise;

    expect(data.clientTime).toBe(clientTime);
    expect(data.serverTime).toBeTypeOf('number');
    client.disconnect();
  });

  it('client:requestState -> server:stateSync', async () => {
    const client = createClient();
    const welcomePromise = waitForEvent(client, 'server:welcome');
    client.connect();
    await welcomePromise;

    const stateSyncPromise = waitForEvent<{ phase: string; timestamp: number }>(
      client,
      'server:stateSync'
    );
    client.emit('client:requestState');
    const data = await stateSyncPromise;

    expect(data.phase).toBe('idle');
    expect(data.timestamp).toBeTypeOf('number');
    client.disconnect();
  });

  it('client appears in registry after registration', async () => {
    const client = createClient();
    const welcomePromise = waitForEvent(client, 'server:welcome');
    client.connect();
    await welcomePromise;

    const registeredPromise = waitForEvent(client, 'server:registered');
    client.emit('client:register', { role: 'captain', teamId: 'team-1' });
    await registeredPromise;

    const clients = getAllClients();
    const found = clients.find((c) => c.socketId === client.id);
    expect(found).toBeDefined();
    expect(found!.role).toBe('captain');
    expect(found!.teamId).toBe('team-1');
    client.disconnect();
  });

  it('rejects registration with invalid role', async () => {
    const client = createClient();
    const welcomePromise = waitForEvent(client, 'server:welcome');
    client.connect();
    await welcomePromise;

    const registeredPromise = waitForEvent<{ success: boolean; error?: string }>(
      client,
      'server:registered'
    );
    client.emit('client:register', { role: 'hacker' as any });
    const data = await registeredPromise;

    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid role');

    // Should NOT be in registry
    const clients = getAllClients();
    const found = clients.find((c) => c.socketId === client.id);
    expect(found).toBeUndefined();
    client.disconnect();
  });

  it('client removed from registry after disconnect', async () => {
    const client = createClient();
    const welcomePromise = waitForEvent(client, 'server:welcome');
    client.connect();
    await welcomePromise;

    const registeredPromise = waitForEvent(client, 'server:registered');
    client.emit('client:register', { role: 'viewer' });
    await registeredPromise;

    const socketId = client.id;
    client.disconnect();

    // Wait a tick for server-side disconnect handler
    await new Promise((r) => setTimeout(r, 100));

    const clients = getAllClients();
    const found = clients.find((c) => c.socketId === socketId);
    expect(found).toBeUndefined();
  });
});
