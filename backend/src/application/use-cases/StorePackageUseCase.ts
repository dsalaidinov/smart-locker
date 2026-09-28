import { Package } from '../../domain/entities/Package';
import { Allocation } from '../../domain/entities/Allocation';
import { LockerSize } from '../../domain/value-objects/LockerSize';
import { PickupCode } from '../../domain/value-objects/PickupCode';
import { NoSuitableLockerAvailableException } from '../../domain/exceptions';
import { ILockerRepository } from '../ports/ILockerRepository';
import { IClockProvider } from '../ports/IClockProvider';
import { IConcurrencyLock } from '../ports/IConcurrencyLock';

export interface StorePackageInput {
  packageSize: LockerSize;
}

export interface StorePackageOutput {
  lockerId: string;
  packageId: string;
  pickupCode: string;
}

/**
 * StorePackageUseCase — allocates the smallest available locker for a package.
 * Protected by a concurrency lock for atomic allocation.
 *
 * Single Responsibility: Only handles package storage allocation.
 */
export class StorePackageUseCase {
  constructor(
    private readonly repository: ILockerRepository,
    private readonly clock: IClockProvider,
    private readonly concurrencyLock: IConcurrencyLock,
  ) {}

  async execute(input: StorePackageInput): Promise<StorePackageOutput> {
    return this.concurrencyLock.runExclusive(async () => {
      const locker = this.repository.findSmallestAvailableLocker(input.packageSize);

      if (!locker) {
        throw new NoSuitableLockerAvailableException();
      }

      const pkg = Package.create(input.packageSize);
      const pickupCode = PickupCode.generate();
      const storedAt = this.clock.now();

      locker.occupy();
      this.repository.saveLocker(locker);

      const allocation = new Allocation(
        locker.id,
        pkg.id,
        pickupCode,
        storedAt,
      );
      this.repository.saveAllocation(allocation);

      return {
        lockerId: locker.id,
        packageId: pkg.id,
        pickupCode: pickupCode.value,
      };
    });
  }
}
