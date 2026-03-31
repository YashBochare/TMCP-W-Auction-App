import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@auction/shared';

type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

export class AuctionTimer {
  private intervalId: NodeJS.Timeout | null = null;
  private secondsRemaining: number;
  private readonly duration: number;
  private io: TypedIO | null = null;
  private onExpireCb: (() => void | Promise<void>) | null = null;

  constructor(duration: number = 20) {
    this.duration = duration;
    this.secondsRemaining = duration;
  }

  setIo(io: TypedIO): void {
    this.io = io;
  }

  setOnExpire(callback: () => void | Promise<void>): void {
    this.onExpireCb = callback;
  }

  start(): void {
    this.stop();
    this.secondsRemaining = this.duration;
    this.broadcastTick();
    this.startInterval();
  }

  startFrom(seconds: number): void {
    this.stop();
    this.secondsRemaining = Math.max(1, Math.min(seconds, this.duration));
    this.broadcastTick();
    this.startInterval();
  }

  reset(): void {
    if (!this.isRunning()) return;
    this.secondsRemaining = this.duration;
    this.broadcastTick();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resume(): void {
    if (this.secondsRemaining > 0 && !this.intervalId) {
      this.broadcastTick();
      this.startInterval();
    }
  }

  getSecondsRemaining(): number {
    return this.secondsRemaining;
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  private startInterval(): void {
    this.intervalId = setInterval(() => {
      this.secondsRemaining--;
      this.broadcastTick();

      if (this.secondsRemaining <= 0) {
        this.stop();
        if (this.onExpireCb) {
          Promise.resolve(this.onExpireCb()).catch((err) =>
            console.error('Timer onExpire callback error:', err)
          );
        }
      }
    }, 1000);
  }

  private broadcastTick(): void {
    if (this.io) {
      this.io.emit('auction:timerTick', { secondsRemaining: this.secondsRemaining });
    }
  }
}

export const auctionTimer = new AuctionTimer(20);
