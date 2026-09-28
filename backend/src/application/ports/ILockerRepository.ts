import { Locker } from '../../domain/entities/Locker';
import { Allocation } from '../../domain/entities/Allocation';
import { LockerSize } from '../../domain/value-objects/LockerSize';

/**
 * Port: ILockerRepository
 * Abstracts persistence of lockers and allocations.
 * Infrastructure layer provides the concrete implementation.
 *
 * Note (ISP trade-off): This interface combines Locker and Allocation persistence.
 * For in-memory storage this is pragmatic (KISS). When migrating to a real database,
 * split into ILockerRepository and IAllocationRepository for proper segregation.
 */
export interface ILockerRepository {
  /** Return all lockers (cloned to prevent external mutation). */
  findAllLockers(): Locker[];

  /** Find a locker by ID. Returns undefined if not found. */
  findLockerById(lockerId: string): Locker | undefined;

  /**
   * Find the smallest available locker that can fit the given package size.
   * Returns undefined if none available.
   */
  findSmallestAvailableLocker(packageSize: LockerSize): Locker | undefined;

  /** Persist locker state update. */
  saveLocker(locker: Locker): void;

  /** Persist a new allocation. */
  saveAllocation(allocation: Allocation): void;

  /** Find the active allocation for a locker. Returns undefined if none. */
  findActiveAllocationByLockerId(lockerId: string): Allocation | undefined;

  /** Persist allocation state update (e.g., deactivation). */
  updateAllocation(allocation: Allocation): void;
}
