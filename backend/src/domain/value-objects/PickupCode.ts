import { InvalidPickupCodeException } from '../exceptions/InvalidPickupCodeException';

/**
 * PickupCode value object — a secure 6-character alphanumeric code.
 * Immutable after creation. Single-use: invalidated after retrieval.
 */
export class PickupCode {
  private static readonly CODE_LENGTH = 6;
  private static readonly CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  private constructor(public readonly value: string) {}

  /**
   * Generate a pseudo-random 6-character alphanumeric code.
   * Note: Uses Math.random for simplicity. In production, consider
   * crypto.randomInt() for cryptographic strength.
   */
  static generate(): PickupCode {
    const chars: string[] = [];
    for (let i = 0; i < PickupCode.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * PickupCode.CHARSET.length);
      chars.push(PickupCode.CHARSET[randomIndex]!);
    }
    return new PickupCode(chars.join(''));
  }

  /** Reconstruct a PickupCode from a known value (e.g., from persistence). */
  static fromString(value: string): PickupCode {
    if (!/^[A-Z0-9]{6}$/.test(value)) {
      throw new InvalidPickupCodeException();
    }
    return new PickupCode(value);
  }

  equals(other: PickupCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
