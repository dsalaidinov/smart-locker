import { describe, it, expect, beforeEach } from 'vitest';
import { Locker } from '../../src/domain/entities/Locker';
import { LockerSize } from '../../src/domain/value-objects/LockerSize';
import { LockerStatus } from '../../src/domain/value-objects/LockerStatus';
import { PickupCode } from '../../src/domain/value-objects/PickupCode';
import { InMemoryLockerRepository } from '../../src/infrastructure/persistence/InMemoryLockerRepository';
import { MockClock } from '../../src/infrastructure/clock/MockClock';
import { MutexConcurrencyLock } from '../../src/application/services/MutexConcurrencyLock';
import { StorePackageUseCase } from '../../src/application/use-cases/StorePackageUseCase';
import { ListLockersUseCase } from '../../src/application/use-cases/ListLockersUseCase';
import { NoSuitableLockerAvailableException, InvalidPickupCodeException } from '../../src/domain/exceptions';

describe('Level 1: Basic Locker & Package Storage', () => {
  let repository: InMemoryLockerRepository;
  let clock: MockClock;
  let lock: MutexConcurrencyLock;
  let storeUseCase: StorePackageUseCase;
  let listUseCase: ListLockersUseCase;

  /** Create a station with 2 SMALL, 2 MEDIUM, 1 LARGE. */
  function createStandardStation(): Locker[] {
    return [
      new Locker('S1', LockerSize.SMALL),
      new Locker('S2', LockerSize.SMALL),
      new Locker('M1', LockerSize.MEDIUM),
      new Locker('M2', LockerSize.MEDIUM),
      new Locker('L1', LockerSize.LARGE),
    ];
  }

  beforeEach(() => {
    repository = new InMemoryLockerRepository(createStandardStation());
    clock = new MockClock();
    lock = new MutexConcurrencyLock();
    storeUseCase = new StorePackageUseCase(repository, clock, lock);
    listUseCase = new ListLockersUseCase(repository);
  });

  describe('Locker Initialization & Availability', () => {
    it('should initialize all lockers as AVAILABLE', () => {
      const lockers = listUseCase.execute();
      expect(lockers).toHaveLength(5);
      expect(lockers.every((l) => l.status === LockerStatus.AVAILABLE)).toBe(true);
    });

    it('should expose locker sizes correctly', () => {
      const lockers = listUseCase.execute();
      const sizes = lockers.map((l) => l.size);
      expect(sizes.filter((s) => s === 'SMALL')).toHaveLength(2);
      expect(sizes.filter((s) => s === 'MEDIUM')).toHaveLength(2);
      expect(sizes.filter((s) => s === 'LARGE')).toHaveLength(1);
    });
  });

  describe('Best-Fit Allocation', () => {
    it('should allocate a SMALL locker for a SMALL package', async () => {
      const result = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      expect(result.lockerId).toMatch(/^S[12]$/);
      expect(result.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should allocate a MEDIUM locker for a MEDIUM package', async () => {
      const result = await storeUseCase.execute({ packageSize: LockerSize.MEDIUM });
      expect(result.lockerId).toMatch(/^M[12]$/);
    });

    it('should allocate a LARGE locker for a LARGE package', async () => {
      const result = await storeUseCase.execute({ packageSize: LockerSize.LARGE });
      expect(result.lockerId).toBe('L1');
    });

    it('should promote SMALL package to MEDIUM locker when all SMALLs are full', async () => {
      // Fill both SMALL lockers
      await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      await storeUseCase.execute({ packageSize: LockerSize.SMALL });

      // Next SMALL should get a MEDIUM
      const result = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      expect(result.lockerId).toMatch(/^M[12]$/);
    });

    it('should promote SMALL package to LARGE locker when all SMALL and MEDIUM are full', async () => {
      // Fill all SMALL and MEDIUM
      await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      await storeUseCase.execute({ packageSize: LockerSize.MEDIUM });
      await storeUseCase.execute({ packageSize: LockerSize.MEDIUM });

      // Next SMALL should get LARGE
      const result = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      expect(result.lockerId).toBe('L1');
    });

    it('should reject when no fitting locker is available', async () => {
      // Fill all lockers
      await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      await storeUseCase.execute({ packageSize: LockerSize.MEDIUM });
      await storeUseCase.execute({ packageSize: LockerSize.MEDIUM });
      await storeUseCase.execute({ packageSize: LockerSize.LARGE });

      await expect(
        storeUseCase.execute({ packageSize: LockerSize.SMALL }),
      ).rejects.toThrow(NoSuitableLockerAvailableException);
    });

    it('should reject LARGE package when only SMALL and MEDIUM are available', async () => {
      // Use a station with only SMALL lockers
      const smallOnly = new InMemoryLockerRepository([
        new Locker('S1', LockerSize.SMALL),
      ]);
      const useCase = new StorePackageUseCase(smallOnly, clock, lock);

      await expect(
        useCase.execute({ packageSize: LockerSize.LARGE }),
      ).rejects.toThrow(NoSuitableLockerAvailableException);
    });
  });

  describe('Pickup Code Generation', () => {
    it('should generate a unique 6-character alphanumeric pickup code', async () => {
      const result = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      expect(result.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(result.pickupCode).toHaveLength(6);
    });

    it('should generate different pickup codes for different allocations', async () => {
      const r1 = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      const r2 = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      // Extremely unlikely to collide, but if they do it's a test flake we accept
      expect(r1.pickupCode).not.toBe(r2.pickupCode);
    });
  });

  describe('Status Tracking', () => {
    it('should mark locker as OCCUPIED after package storage', async () => {
      const result = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      const lockers = listUseCase.execute();
      const occupied = lockers.find((l) => l.id === result.lockerId);
      expect(occupied?.status).toBe(LockerStatus.OCCUPIED);
    });

    it('should decrease available count after each allocation', async () => {
      const before = listUseCase.execute().filter((l) => l.status === LockerStatus.AVAILABLE).length;
      await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      const after = listUseCase.execute().filter((l) => l.status === LockerStatus.AVAILABLE).length;
      expect(after).toBe(before - 1);
    });
  });

  describe('PickupCode Value Object', () => {
    it('should generate valid codes', () => {
      const code = PickupCode.generate();
      expect(code.value).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should reconstruct from valid string', () => {
      const code = PickupCode.fromString('ABC123');
      expect(code.value).toBe('ABC123');
    });

    it('should reject invalid strings', () => {
      expect(() => PickupCode.fromString('abc')).toThrow(InvalidPickupCodeException);
      expect(() => PickupCode.fromString('TOOLONG!')).toThrow(InvalidPickupCodeException);
    });

    it('should compare equality correctly', () => {
      const a = PickupCode.fromString('ABC123');
      const b = PickupCode.fromString('ABC123');
      const c = PickupCode.fromString('XYZ789');
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });
  });
});
