import { describe, it, expect, beforeEach } from 'vitest';
import { Locker } from '../../src/domain/entities/Locker';
import { LockerSize } from '../../src/domain/value-objects/LockerSize';
import { InMemoryLockerRepository } from '../../src/infrastructure/persistence/InMemoryLockerRepository';
import { MockClock } from '../../src/infrastructure/clock/MockClock';
import { MutexConcurrencyLock } from '../../src/application/services/MutexConcurrencyLock';
import { TieredPricingStrategy } from '../../src/domain/strategies/TieredPricingStrategy';
import { StorePackageUseCase } from '../../src/application/use-cases/StorePackageUseCase';
import { RetrievePackageUseCase } from '../../src/application/use-cases/RetrievePackageUseCase';

describe('Level 3: Extended Storage Charges (Pricing Engine)', () => {
  let repository: InMemoryLockerRepository;
  let clock: MockClock;
  let lock: MutexConcurrencyLock;
  let storeUseCase: StorePackageUseCase;
  let retrieveUseCase: RetrievePackageUseCase;
  const BASE_RATE_CENTS = 100; // $1.00

  beforeEach(() => {
    repository = new InMemoryLockerRepository([
      new Locker('S1', LockerSize.SMALL),
      new Locker('S2', LockerSize.SMALL),
      new Locker('S3', LockerSize.SMALL),
      new Locker('S4', LockerSize.SMALL),
      new Locker('S5', LockerSize.SMALL),
      new Locker('S6', LockerSize.SMALL),
    ]);
    clock = new MockClock(new Date('2025-01-01T00:00:00Z'));
    lock = new MutexConcurrencyLock();
    storeUseCase = new StorePackageUseCase(repository, clock, lock);
    retrieveUseCase = new RetrievePackageUseCase(
      repository,
      clock,
      new TieredPricingStrategy(BASE_RATE_CENTS),
    );
  });

  describe('TieredPricingStrategy Unit Tests', () => {
    const strategy = new TieredPricingStrategy(100);

    it('should calculate $1.00 for 1 day', () => {
      expect(strategy.calculate(1)).toBe(100);
    });

    it('should calculate $5.00 for 5 days (5 × $1)', () => {
      expect(strategy.calculate(5)).toBe(500);
    });

    it('should calculate $7.00 for 6 days (5×$1 + 1×$2)', () => {
      expect(strategy.calculate(6)).toBe(700);
    });

    it('should calculate $15.00 for 10 days (5×$1 + 5×$2)', () => {
      expect(strategy.calculate(10)).toBe(1500);
    });

    it('should calculate $21.00 for 12 days (5×$1 + 5×$2 + 2×$3)', () => {
      expect(strategy.calculate(12)).toBe(2100);
    });

    it('should return 0 for 0 or negative days', () => {
      expect(strategy.calculate(0)).toBe(0);
      expect(strategy.calculate(-1)).toBe(0);
    });
  });

  describe('Time-Based Fee Integration with MockClock', () => {
    it('should charge 1 day for retrieval within 24 hours', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      clock.advanceByHours(12);

      const result = retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      expect(result.durationDays).toBe(1);
      expect(result.totalStorageFee).toBe(100); // $1.00
    });

    it('should charge 1 day for retrieval at exactly 24 hours', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      clock.advanceByHours(24);

      const result = retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      expect(result.durationDays).toBe(1);
      expect(result.totalStorageFee).toBe(100);
    });

    it('should charge 2 days for retrieval at 25 hours', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      clock.advanceByHours(25);

      const result = retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      expect(result.durationDays).toBe(2);
      expect(result.totalStorageFee).toBe(200); // 2 × $1.00
    });

    it('should charge correct tiered fee for 6 days', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      clock.advanceByDays(6);

      const result = retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      expect(result.durationDays).toBe(6);
      expect(result.totalStorageFee).toBe(700); // 5×$1 + 1×$2
    });

    it('should charge correct tiered fee for 12 days', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      clock.advanceByDays(12);

      const result = retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      expect(result.durationDays).toBe(12);
      expect(result.totalStorageFee).toBe(2100); // 5×$1 + 5×$2 + 2×$3
    });

    it('should return correct currency', async () => {
      const stored = await storeUseCase.execute({ packageSize: LockerSize.SMALL });
      clock.advanceByHours(1);

      const result = retrieveUseCase.execute({
        lockerId: stored.lockerId,
        pickupCode: stored.pickupCode,
      });

      expect(result.currency).toBe('USD');
    });
  });
});
