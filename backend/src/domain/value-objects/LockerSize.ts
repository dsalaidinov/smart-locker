/**
 * LockerSize value object — strictly ordered: SMALL < MEDIUM < LARGE.
 * The numeric ranking enables best-fit allocation comparisons.
 */
export enum LockerSize {
  SMALL = 1,
  MEDIUM = 2,
  LARGE = 3,
}

/** Ordered list of locker sizes from smallest to largest. */
export const LOCKER_SIZE_ORDER: readonly LockerSize[] = [
  LockerSize.SMALL,
  LockerSize.MEDIUM,
  LockerSize.LARGE,
] as const;
