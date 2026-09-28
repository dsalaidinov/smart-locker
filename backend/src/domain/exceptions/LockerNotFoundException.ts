import { DomainException } from './DomainException';

export class LockerNotFoundException extends DomainException {
  readonly code = 'LOCKER_NOT_FOUND';

  constructor(lockerId: string) {
    super(`Locker with ID "${lockerId}" does not exist.`);
  }
}
