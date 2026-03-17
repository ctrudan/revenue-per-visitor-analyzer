/**
 * Statistical constants used across the analysis.
 * Centralised here to avoid magic numbers in business logic.
 */

/** Two-tailed significance threshold */
export const SIGNIFICANCE_ALPHA = 0.05;

/** Desired statistical power for runtime estimates (1 - β) */
export const TARGET_POWER = 0.8;

/** Z-score for 95 % confidence (two-tailed α = 0.05 → α/2 = 0.025) */
export const Z_ALPHA_TWO_TAILED = 1.96;

/** Z-score for 80 % power (β = 0.20) */
export const Z_BETA = 0.8416;

/** Minimum transactions required per arm before analysis is attempted */
export const MIN_TRANSACTIONS_PER_ARM = 5;

/** Currency format options */
export const CURRENCY_FORMAT = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/** Percentage format options */
export const PERCENT_FORMAT = {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};
