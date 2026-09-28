import { DomainException } from './DomainException';

export class InvalidPickupCodeException extends DomainException {
  readonly code = 'INVALID_PICKUP_CODE';

  constructor() {
    super('The provided pickup code does not match.');
  }
}
