import { DomainException } from './DomainException';

export class NoSuitableLockerAvailableException extends DomainException {
  readonly code = 'NO_SUITABLE_LOCKER';

  constructor(message = 'No suitable locker is available for the requested package size.') {
    super(message);
  }
}
