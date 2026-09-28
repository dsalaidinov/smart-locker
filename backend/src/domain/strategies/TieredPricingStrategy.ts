import { IPricingStrategy } from './IPricingStrategy';

/**
 * TieredPricingStrategy — implements tiered daily pricing:
 *   Days 1–5:   baseRate per day
 *   Days 6–10:  2× baseRate per day
 *   Days 11+:   3× baseRate per day
 */
export class TieredPricingStrategy implements IPricingStrategy {
  readonly currency = 'USD';

  constructor(private readonly baseRateCents: number = 100) {}

  calculate(durationDays: number): number {
    if (durationDays <= 0) {
      return 0;
    }

    let totalCents = 0;

    for (let day = 1; day <= durationDays; day++) {
      if (day <= 5) {
        totalCents += this.baseRateCents;
      } else if (day <= 10) {
        totalCents += this.baseRateCents * 2;
      } else {
        totalCents += this.baseRateCents * 3;
      }
    }

    return totalCents;
  }
}
