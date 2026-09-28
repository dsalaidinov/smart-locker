import { DomainException } from './DomainException';

export class LockerAlreadyEmptyException extends DomainException {
  readonly code = 'LOCKER_ALREADY_EMPTY';

  constructor(lockerId: string) {
    super(`Locker "${lockerId}" is already empty — no package to retrieve.`);
  }
}
