/**
 * Base class for all domain-specific exceptions.
 * Enables consistent error handling across the application boundary.
 */
export abstract class DomainException extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
