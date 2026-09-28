import { IClockProvider } from '../../application/ports/IClockProvider';

/**
 * MockClock — test clock implementation that returns a controllable time.
 * Enables deterministic testing of time-dependent logic without real-time delays.
 */
export class MockClock implements IClockProvider {
  private currentTime: Date;

  constructor(initialTime: Date = new Date('2025-01-01T00:00:00Z')) {
    this.currentTime = new Date(initialTime.getTime());
  }

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  /** Advance the mock clock by a given number of hours. */
  advanceByHours(hours: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + hours * 60 * 60 * 1000);
  }

  /** Advance the mock clock by a given number of days. */
  advanceByDays(days: number): void {
    this.advanceByHours(days * 24);
  }

  /** Set the mock clock to a specific time. */
  setTime(time: Date): void {
    this.currentTime = new Date(time.getTime());
  }
}
