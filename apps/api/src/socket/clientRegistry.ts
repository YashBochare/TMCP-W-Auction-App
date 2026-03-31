import type { ClientRole } from '@auction/shared';

export interface ConnectedClient {
  socketId: string;
  role: ClientRole;
  teamId?: string;
  connectedAt: Date;
}

const clients = new Map<string, ConnectedClient>();

export function addClient(socketId: string, role: ClientRole, teamId?: string): ConnectedClient {
  const client: ConnectedClient = { socketId, role, teamId, connectedAt: new Date() };
  clients.set(socketId, client);
  return client;
}

export function removeClient(socketId: string): boolean {
  return clients.delete(socketId);
}

export function getClient(socketId: string): ConnectedClient | undefined {
  return clients.get(socketId);
}

export function getClientsByRole(role: ClientRole): ConnectedClient[] {
  return Array.from(clients.values()).filter((c) => c.role === role);
}

export function getAllClients(): ConnectedClient[] {
  return Array.from(clients.values());
}

export function getClientCount(): number {
  return clients.size;
}

export function clearAll(): void {
  clients.clear();
}
