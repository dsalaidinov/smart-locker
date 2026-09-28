/**
 * Port: IConcurrencyLock
 * Abstracts the concurrency synchronization primitive.
 */
export interface IConcurrencyLock {
  /** Execute a callback within an exclusive lock, ensuring atomicity. */
  runExclusive<T>(callback: () => Promise<T>): Promise<T>;
}
