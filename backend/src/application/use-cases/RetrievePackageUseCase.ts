import { PickupCode } from '../../domain/value-objects/PickupCode';
import {
  LockerNotFoundException,
  LockerAlreadyEmptyException,
  InvalidPickupCodeException,
} from '../../domain/exceptions';
import { IPricingStrategy } from '../../domain/strategies/IPricingStrategy';
import { ILockerRepository } from '../ports/ILockerRepository';
import { IClockProvider } from '../ports/IClockProvider';

export interface RetrievePackageInput {
  lockerId: string;
  pickupCode: string;
}

export interface RetrievePackageOutput {
  lockerId: string;
  packageId: string;
  durationDays: number;
  totalStorageFee: number;
  currency: string;
}

/**
 * RetrievePackageUseCase — validates pickup code, calculates storage fee, releases locker.
 *
 * Single Responsibility: Only handles package retrieval and billing.
 */
export class RetrievePackageUseCase {
  constructor(
    private readonly repository: ILockerRepository,
    private readonly clock: IClockProvider,
    private readonly pricingStrategy: IPricingStrategy,
  ) {}

  execute(input: RetrievePackageInput): RetrievePackageOutput {
    // 1. Validate locker exists
    const locker = this.repository.findLockerById(input.lockerId);
    if (!locker) {
      throw new LockerNotFoundException(input.lockerId);
    }

    // 2. Find active allocation
    const allocation = this.repository.findActiveAllocationByLockerId(input.lockerId);
    if (!allocation) {
      throw new LockerAlreadyEmptyException(input.lockerId);
    }

    // 3. Validate pickup code
    const providedCode = PickupCode.fromString(input.pickupCode);
    if (!allocation.validatePickupCode(providedCode)) {
      throw new InvalidPickupCodeException();
    }

    // 4. Calculate storage duration and fee
    const retrievedAt = this.clock.now();
    const durationMs = retrievedAt.getTime() - allocation.storedAt.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const durationDays = Math.max(1, Math.ceil(durationHours / 24));
    const totalStorageFee = this.pricingStrategy.calculate(durationDays);

    // 5. Deactivate allocation and release locker
    allocation.deactivate();
    this.repository.updateAllocation(allocation);

    locker.release();
    this.repository.saveLocker(locker);

    return {
      lockerId: locker.id,
      packageId: allocation.packageId,
      durationDays,
      totalStorageFee,
      currency: this.pricingStrategy.currency,
    };
  }
}
