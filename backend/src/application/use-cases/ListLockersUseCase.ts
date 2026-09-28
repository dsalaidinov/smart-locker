import { LockerSize } from '../../domain/value-objects/LockerSize';
import { LockerStatus } from '../../domain/value-objects/LockerStatus';
import { ILockerRepository } from '../ports/ILockerRepository';

export interface LockerView {
  id: string;
  size: string;
  status: LockerStatus;
}

/**
 * ListLockersUseCase — returns the current status of all lockers.
 *
 * Single Responsibility: Read-only query for locker availability.
 */
export class ListLockersUseCase {
  constructor(private readonly repository: ILockerRepository) {}

  execute(): LockerView[] {
    const lockers = this.repository.findAllLockers();

    return lockers.map((locker) => ({
      id: locker.id,
      size: LockerSize[locker.size] ?? String(locker.size),
      status: locker.status,
    }));
  }
}
