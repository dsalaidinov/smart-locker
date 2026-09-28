import { describe, it, expect } from 'vitest';
import { Locker } from '../../src/domain/entities/Locker';
import { LockerSize } from '../../src/domain/value-objects/LockerSize';
import { InMemoryLockerRepository } from '../../src/infrastructure/persistence/InMemoryLockerRepository';
import { MockClock } from '../../src/infrastructure/clock/MockClock';
import { MutexConcurrencyLock } from '../../src/application/services/MutexConcurrencyLock';
import { StorePackageUseCase } from '../../src/application/use-cases/StorePackageUseCase';
import { NoSuitableLockerAvailableException } from '../../src/domain/exceptions';

describe('Level 4: High Concurrency & Race Condition Safety', () => {
  it('should allow exactly 3 packages when 3 lockers exist and 30 concurrent requests arrive', async () => {
    const repository = new InMemoryLockerRepository([
      new Locker('S1', LockerSize.SMALL),
      new Locker('M1', LockerSize.MEDIUM),
      new Locker('L1', LockerSize.LARGE),
    ]);
    const clock = new MockClock();
    const lock = new MutexConcurrencyLock();
    const storeUseCase = new StorePackageUseCase(repository, clock, lock);

    // Fire 30 simultaneous store requests
    const requests = Array.from({ length: 30 }, () =>
      storeUseCase
        .execute({ packageSize: LockerSize.SMALL })
        .then((result) => ({ status: 'fulfilled' as const, result }))
        .catch((error: unknown) => ({ status: 'rejected' as const, error })),
    );

    const results = await Promise.all(requests);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Exactly 3 succeed
    expect(successes).toHaveLength(3);
    // Exactly 27 fail
    expect(failures).toHaveLength(27);

    // All failures should be NoSuitableLockerAvailableException
    for (const failure of failures) {
      if (failure.status === 'rejected') {
        expect(failure.error).toBeInstanceOf(NoSuitableLockerAvailableException);
      }
    }

    // No two successes should have the same locker
    const assignedLockerIds = successes.map((s) => {
      if (s.status === 'fulfilled') return s.result.lockerId;
      return '';
    });
    const uniqueLockerIds = new Set(assignedLockerIds);
    expect(uniqueLockerIds.size).toBe(3);

    // Verify final state: all lockers occupied
    const allLockers = repository.findAllLockers();
    expect(allLockers.every((l) => !l.isAvailable)).toBe(true);
  });

  it('should handle 50+ concurrent requests to a single-locker station', async () => {
    const repository = new InMemoryLockerRepository([
      new Locker('ONLY1', LockerSize.MEDIUM),
    ]);
    const clock = new MockClock();
    const lock = new MutexConcurrencyLock();
    const storeUseCase = new StorePackageUseCase(repository, clock, lock);

    const requests = Array.from({ length: 50 }, () =>
      storeUseCase
        .execute({ packageSize: LockerSize.SMALL })
        .then((result) => ({ status: 'fulfilled' as const, result }))
        .catch((error: unknown) => ({ status: 'rejected' as const, error })),
    );

    const results = await Promise.all(requests);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(49);
  });

  it('should maintain state consistency under concurrent mixed-size requests', async () => {
    const repository = new InMemoryLockerRepository([
      new Locker('S1', LockerSize.SMALL),
      new Locker('S2', LockerSize.SMALL),
      new Locker('M1', LockerSize.MEDIUM),
      new Locker('L1', LockerSize.LARGE),
    ]);
    const clock = new MockClock();
    const lock = new MutexConcurrencyLock();
    const storeUseCase = new StorePackageUseCase(repository, clock, lock);

    // Mix of sizes
    const sizes = [
      ...Array.from({ length: 10 }, () => LockerSize.SMALL),
      ...Array.from({ length: 10 }, () => LockerSize.MEDIUM),
      ...Array.from({ length: 10 }, () => LockerSize.LARGE),
    ];

    const requests = sizes.map((size) =>
      storeUseCase
        .execute({ packageSize: size })
        .then((result) => ({ status: 'fulfilled' as const, result }))
        .catch((error: unknown) => ({ status: 'rejected' as const, error })),
    );

    const results = await Promise.all(requests);

    const successes = results.filter((r) => r.status === 'fulfilled');
    // At most 4 can succeed (4 lockers)
    expect(successes.length).toBeLessThanOrEqual(4);
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // No duplicate locker assignments
    const assignedIds = successes.map((s) => {
      if (s.status === 'fulfilled') return s.result.lockerId;
      return '';
    });
    expect(new Set(assignedIds).size).toBe(assignedIds.length);

    // Final state: all assigned lockers are occupied
    const allLockers = repository.findAllLockers();
    const occupiedCount = allLockers.filter((l) => !l.isAvailable).length;
    expect(occupiedCount).toBe(successes.length);
  });
});
