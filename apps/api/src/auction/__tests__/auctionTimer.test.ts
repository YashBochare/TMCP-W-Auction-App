import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuctionTimer } from '../auctionTimer.js';

describe('AuctionTimer', () => {
  let timer: AuctionTimer;
  let mockIo: any;

  beforeEach(() => {
    vi.useFakeTimers();
    timer = new AuctionTimer(20);
    mockIo = { emit: vi.fn() };
    timer.setIo(mockIo);
  });

  afterEach(() => {
    timer.stop();
    vi.useRealTimers();
  });

  describe('start()', () => {
    it('starts at configured duration', () => {
      timer.start();
      expect(timer.getSecondsRemaining()).toBe(20);
      expect(timer.isRunning()).toBe(true);
    });

    it('broadcasts initial tick immediately', () => {
      timer.start();
      expect(mockIo.emit).toHaveBeenCalledWith('auction:timerTick', { secondsRemaining: 20 });
    });

    it('decrements by 1 each second', () => {
      timer.start();
      vi.advanceTimersByTime(1000);
      expect(timer.getSecondsRemaining()).toBe(19);
      vi.advanceTimersByTime(1000);
      expect(timer.getSecondsRemaining()).toBe(18);
    });

    it('broadcasts tick every second', () => {
      timer.start();
      mockIo.emit.mockClear();
      vi.advanceTimersByTime(3000);
      expect(mockIo.emit).toHaveBeenCalledTimes(3);
      expect(mockIo.emit).toHaveBeenCalledWith('auction:timerTick', { secondsRemaining: 19 });
      expect(mockIo.emit).toHaveBeenCalledWith('auction:timerTick', { secondsRemaining: 18 });
      expect(mockIo.emit).toHaveBeenCalledWith('auction:timerTick', { secondsRemaining: 17 });
    });

    it('starting already-running timer resets it', () => {
      timer.start();
      vi.advanceTimersByTime(5000);
      expect(timer.getSecondsRemaining()).toBe(15);
      timer.start();
      expect(timer.getSecondsRemaining()).toBe(20);
    });
  });

  describe('reset()', () => {
    it('resets to duration', () => {
      timer.start();
      vi.advanceTimersByTime(5000);
      timer.reset();
      expect(timer.getSecondsRemaining()).toBe(20);
    });

    it('broadcasts reset immediately', () => {
      timer.start();
      vi.advanceTimersByTime(5000);
      mockIo.emit.mockClear();
      timer.reset();
      expect(mockIo.emit).toHaveBeenCalledWith('auction:timerTick', { secondsRemaining: 20 });
    });

    it('timer continues running after reset', () => {
      timer.start();
      vi.advanceTimersByTime(5000);
      timer.reset();
      expect(timer.isRunning()).toBe(true);
      vi.advanceTimersByTime(1000);
      expect(timer.getSecondsRemaining()).toBe(19);
    });

    it('reset while stopped does not start timer', () => {
      timer.reset();
      expect(timer.isRunning()).toBe(false);
    });
  });

  describe('stop()', () => {
    it('clears the interval', () => {
      timer.start();
      timer.stop();
      expect(timer.isRunning()).toBe(false);
    });

    it('stopping when already stopped is a no-op', () => {
      timer.stop();
      expect(timer.isRunning()).toBe(false);
    });
  });

  describe('expiry', () => {
    it('calls onExpire after duration', () => {
      const onExpire = vi.fn();
      timer.setOnExpire(onExpire);
      timer.start();
      vi.advanceTimersByTime(20000);
      expect(onExpire).toHaveBeenCalledOnce();
    });

    it('timer stops after reaching 0', () => {
      timer.setOnExpire(vi.fn());
      timer.start();
      vi.advanceTimersByTime(20000);
      expect(timer.isRunning()).toBe(false);
    });
  });

  describe('pause/resume', () => {
    it('pause preserves secondsRemaining', () => {
      timer.start();
      vi.advanceTimersByTime(5000);
      timer.pause();
      expect(timer.getSecondsRemaining()).toBe(15);
      expect(timer.isRunning()).toBe(false);
    });

    it('resume continues from paused value', () => {
      timer.start();
      vi.advanceTimersByTime(5000);
      timer.pause();
      timer.resume();
      expect(timer.isRunning()).toBe(true);
      vi.advanceTimersByTime(1000);
      expect(timer.getSecondsRemaining()).toBe(14);
    });

    it('resume broadcasts current value immediately', () => {
      timer.start();
      vi.advanceTimersByTime(5000);
      timer.pause();
      mockIo.emit.mockClear();
      timer.resume();
      expect(mockIo.emit).toHaveBeenCalledWith('auction:timerTick', { secondsRemaining: 15 });
    });
  });

  describe('startFrom()', () => {
    it('starts from given seconds', () => {
      timer.startFrom(10);
      expect(timer.getSecondsRemaining()).toBe(10);
      expect(timer.isRunning()).toBe(true);
    });

    it('clamps to minimum 1', () => {
      timer.startFrom(0);
      expect(timer.getSecondsRemaining()).toBe(1);
    });

    it('clamps to maximum duration', () => {
      timer.startFrom(100);
      expect(timer.getSecondsRemaining()).toBe(20);
    });
  });

  describe('getSecondsRemaining()', () => {
    it('returns duration before start', () => {
      expect(timer.getSecondsRemaining()).toBe(20);
    });

    it('returns current value during countdown', () => {
      timer.start();
      vi.advanceTimersByTime(7000);
      expect(timer.getSecondsRemaining()).toBe(13);
    });

    it('returns 0 after expiry', () => {
      timer.setOnExpire(vi.fn());
      timer.start();
      vi.advanceTimersByTime(20000);
      expect(timer.getSecondsRemaining()).toBe(0);
    });
  });
});
