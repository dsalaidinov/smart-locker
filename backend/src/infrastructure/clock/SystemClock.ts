import { IClockProvider } from '../../application/ports/IClockProvider';

/**
 * SystemClock — production clock implementation that returns the real current time.
 */
export class SystemClock implements IClockProvider {
  now(): Date {
    return new Date();
  }
}
