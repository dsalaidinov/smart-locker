import { Mutex } from 'async-mutex';
import { IConcurrencyLock } from '../../application/ports/IConcurrencyLock';

/**
 * MutexConcurrencyLock — wraps async-mutex to protect critical sections.
 * Ensures atomic locker allocation, preventing race conditions.
 */
export class MutexConcurrencyLock implements IConcurrencyLock {
  private readonly mutex = new Mutex();

  async runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(callback);
  }
}
