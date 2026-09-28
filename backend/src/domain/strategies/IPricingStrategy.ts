/**
 * IPricingStrategy — Strategy pattern interface for storage fee calculation.
 * Open/Closed principle: new pricing models can be added without modifying existing code.
 */
export interface IPricingStrategy {
  /**
   * Calculate the total storage fee.
   * @param durationDays - Number of days the package was stored (minimum 1).
   * @returns The total fee in cents (integer) to avoid floating-point issues.
   */
  calculate(durationDays: number): number;

  /** The ISO 4217 currency code. */
  readonly currency: string;
}
