import { Locker } from '../../domain/entities/Locker';
import { Allocation } from '../../domain/entities/Allocation';
import { LockerSize, LOCKER_SIZE_ORDER } from '../../domain/value-objects/LockerSize';
import { ILockerRepository } from '../../application/ports/ILockerRepository';

/**
 * InMemoryLockerRepository — thread-safe in-memory persistence.
 * All reads return cloned entities to prevent external mutation of internal state.
 */
export class InMemoryLockerRepository implements ILockerRepository {
  private readonly lockers: Map<string, Locker> = new Map();
  private readonly allocations: Map<string, Allocation> = new Map();

  constructor(initialLockers: Locker[] = []) {
    for (const locker of initialLockers) {
      this.lockers.set(locker.id, locker);
    }
  }

  findAllLockers(): Locker[] {
    return Array.from(this.lockers.values()).map((l) => l.clone());
  }

  findLockerById(lockerId: string): Locker | undefined {
    const locker = this.lockers.get(lockerId);
    return locker?.clone();
  }

  findSmallestAvailableLocker(packageSize: LockerSize): Locker | undefined {
    // Iterate sizes in order (SMALL → MEDIUM → LARGE) to find best-fit
    for (const size of LOCKER_SIZE_ORDER) {
      if (size < packageSize) continue;

      for (const locker of this.lockers.values()) {
        if (locker.size === size && locker.isAvailable) {
          return locker; // Return the actual reference for atomic mutation within the lock
        }
      }
    }
    return undefined;
  }

  saveLocker(locker: Locker): void {
    this.lockers.set(locker.id, locker);
  }

  saveAllocation(allocation: Allocation): void {
    // Key by lockerId for fast lookup during retrieval
    this.allocations.set(allocation.lockerId, allocation);
  }

  findActiveAllocationByLockerId(lockerId: string): Allocation | undefined {
    const allocation = this.allocations.get(lockerId);
    if (allocation && allocation.isActive) {
      return allocation.clone();
    }
    return undefined;
  }

  updateAllocation(allocation: Allocation): void {
    this.allocations.set(allocation.lockerId, allocation);
  }
}
