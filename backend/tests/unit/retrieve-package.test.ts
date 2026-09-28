import { describe, it, expect, beforeEach } from 'vitest';
import { Locker } from '../../src/domain/entities/Locker';
import { LockerSize } from '../../src/domain/value-objects/LockerSize';
import { LockerStatus } from '../../src/domain/value-objects/LockerStatus';
import { InMemoryLockerRepository } from '../../src/infrastructure/persistence/InMemoryLockerRepository';
import { MockClock } from '../../src/infrastructure/clock/MockClock';
import { MutexConcurrencyLock } from '../../src/application/services/MutexConcurrencyLock';
import { TieredPricingStrategy } from '../../src/domain/strategies/TieredPricingStrategy';
import { StorePackageUseCase } from '../../src/application/use-cases/StorePackageUseCase';
import { RetrievePackageUseCase } from '../../src/application/use-cases/RetrievePackageUseCase';
import { ListLockersUseCase } from '../../src/application/use-cases/ListLockersUseCase';
import {
  LockerNotFoundException,
  LockerAlreadyEmptyException,
  InvalidPickupCodeException,
} from '../../src/domain/exceptions';

describe('Level 2: Package Retrieval & Lifecycle Management', () => {
  let repository: InMemoryLockerRepository;
  let clock: MockClock;
  let lock: MutexConcurrencyLock;
  let storeUseCase: StorePackageUseCase;
  let retrieveUseCase: RetrievePackageUseCase;
  let listUseCase: ListLockersUseCase;

  beforeEach(() => {
    repository = new InMemoryLockerRepository([
      new Locker('S1', LockerSize.SMALL),
      new Locker('M1', LockerSize.MEDIUM),
      new Locker('L1', LockerSize.LARGE),
    ]);
    clock = new MockClock();
    lock = new MutexConcurrencyLock();
    storeUseCase = new StorePackageUseCase(repository, clock, lock);
    retrieveUseCase = new RetrievePackageUseCase(
      repository,
      clock,
      new TieredPricingStrategy(),
    );
    listUseCase = new ListLockersUseCase(repository);
  });

  describe('Successful Retrieval', () => {
    it('should retrieve a package with valid lockerId and pickupCode', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      clock.advanceByHours(2); // Within first day

      const result = retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      expect(result.lockerId).toBe(stored.lockerId);
      expect(result.packageId).toBe(stored.packageId);
      expect(result.durationDays).toBe(1);
      expect(result.currency).toBe('USD');
    });

    it('should mark locker as AVAILABLE after retrieval', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      const lockers = listUseCase.execute();
      const locker = lockers.find((l) => l.id === stored.lockerId);
      expect(locker?.status).toBe(LockerStatus.AVAILABLE);
    });

    it('should allow re-use of locker after retrieval', async () => {
      const stored1 = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      retrieveUseCase.execute({
        lockerId: stored1.lockerId,
        pickupCode: stored1.pickupCode,
      });

      // Should be able to store again in the same locker
      const stored2 = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      expect(stored2.lockerId).toBe('S1');
    });
  });

  describe('Retrieval Validation Errors', () => {
    it('should throw LockerNotFoundException for non-existent locker', () => {
      expect(() =>
        retrieveUseCase.execute({
          lockerId: 'NON_EXISTENT',
          pickupCode: 'ABC123',
        }),
      ).toThrow(LockerNotFoundException);
    });

    it('should throw LockerAlreadyEmptyException for empty locker', () => {
      expect(() =>
        retrieveUseCase.execute({
          lockerId: 'S1',
          pickupCode: 'ABC123',
        }),
      ).toThrow(LockerAlreadyEmptyException);
    });

    it('should throw InvalidPickupCodeException for wrong code', async () => {
      await storeUseCase.execute({ packageSize: LockerSize.SMALL });

      expect(() =>
        retrieveUseCase.execute({
          lockerId: 'S1',
          pickupCode: 'WRONG1',
        }),
      ).toThrow(InvalidPickupCodeException);
    });

    it('should throw LockerAlreadyEmptyException on double-pickup attempt', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });

      // First retrieval succeeds
      retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      // Second retrieval fails — locker is already empty
      expect(() =>
        retrieveUseCase.execute({
          lockerId: stored.lockerId,
          pickupCode: stored.pickupCode,
        }),
      ).toThrow(LockerAlreadyEmptyException);
    });
  });

  describe('Pickup Code Invalidation', () => {
    it('should invalidate pickup code after successful retrieval (single-use)', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });

      // Retrieve
      retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      // Store again in the same locker
      const stored2 = await storeUseCase.execute({ packageSize: LockerSize.SMALL });

      // Old code should not work on new allocation
      expect(() =>
        retrieveUseCase.execute({
          lockerId: stored2.lockerId,
          pickupCode: stored.pickupCode,
        }),
      ).toThrow(InvalidPickupCodeException);
    });
  });
});
