/**
 * Port: IClockProvider
 * Abstracts the system clock for deterministic testing of time-dependent logic.
 */
export interface IClockProvider {
  now(): Date;
}
