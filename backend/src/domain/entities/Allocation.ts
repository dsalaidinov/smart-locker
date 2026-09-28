import { PickupCode } from '../value-objects/PickupCode';

/**
 * Allocation entity — binds a package to a locker with a pickup code and timestamp.
 * This is the aggregate root for the storage lifecycle.
 */
export class Allocation {
  public readonly lockerId: string;
  public readonly packageId: string;
  public readonly pickupCode: PickupCode;
  public readonly storedAt: Date;
  private _isActive: boolean;

  constructor(
    lockerId: string,
    packageId: string,
    pickupCode: PickupCode,
    storedAt: Date,
    isActive = true,
  ) {
    this.lockerId = lockerId;
    this.packageId = packageId;
    this.pickupCode = pickupCode;
    this.storedAt = storedAt;
    this._isActive = isActive;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  /** Validates the provided pickup code against the stored one. */
  validatePickupCode(code: PickupCode): boolean {
    return this._isActive && this.pickupCode.equals(code);
  }

  /** Deactivate the allocation (pickup code becomes invalid). */
  deactivate(): void {
    this._isActive = false;
  }

  clone(): Allocation {
    return new Allocation(
      this.lockerId,
      this.packageId,
      PickupCode.fromString(this.pickupCode.value),
      new Date(this.storedAt.getTime()),
      this._isActive,
    );
  }
}
