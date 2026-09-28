import { LockerSize } from '../value-objects/LockerSize';
import { LockerStatus } from '../value-objects/LockerStatus';

/**
 * Locker entity — represents a physical locker compartment.
 * Rich domain entity with state transition logic.
 */
export class Locker {
  public readonly id: string;
  public readonly size: LockerSize;
  private _status: LockerStatus;

  constructor(id: string, size: LockerSize, status: LockerStatus = LockerStatus.AVAILABLE) {
    this.id = id;
    this.size = size;
    this._status = status;
  }

  get status(): LockerStatus {
    return this._status;
  }

  get isAvailable(): boolean {
    return this._status === LockerStatus.AVAILABLE;
  }

  /** Transition locker to OCCUPIED state. */
  occupy(): void {
    this._status = LockerStatus.OCCUPIED;
  }

  /** Transition locker back to AVAILABLE state. */
  release(): void {
    this._status = LockerStatus.AVAILABLE;
  }

  /** Create a deep clone of this locker (for safe repository reads). */
  clone(): Locker {
    return new Locker(this.id, this.size, this._status);
  }
}

