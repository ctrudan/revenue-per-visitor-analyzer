/**
 * statistics.js
 *
 * Pure statistical functions for the Revenue Per Visitor Analyzer.
 *
 * All functions are stateless — they take arrays/numbers in and return results.
 * This makes them easy to test and audit independently of the UI.
 */

import {
  mean as ssMean,
  variance as ssVariance,
  standardDeviation as ssStd,
} from 'simple-statistics';

import {
  SIGNIFICANCE_ALPHA,
  Z_ALPHA_TWO_TAILED,
  Z_BETA,
} from '../constants';

/* ═══════════════════════════════════════════════════════
   1. WELCH'S T-TEST
   ═══════════════════════════════════════════════════════ */

/**
 * Two-sample Welch's t-test (unequal variances).
 *
 * @param {number[]} a  Sample A values
 * @param {number[]} b  Sample B values
 * @returns {{ tStatistic: number, degreesOfFreedom: number, pValue: number }}
 */
export function welchTTest(a, b) {
  const nA = a.length;
  const nB = b.length;
  const meanA = ssMean(a);
  const meanB = ssMean(b);
  const varA = ssVariance(a);
  const varB = ssVariance(b);

  const seA = varA / nA;
  const seB = varB / nB;
  const seDiff = Math.sqrt(seA + seB);

  if (seDiff === 0) {
    return { tStatistic: 0, degreesOfFreedom: nA + nB - 2, pValue: 1 };
  }

  const t = (meanA - meanB) / seDiff;

  // Welch-Satterthwaite degrees of freedom
  const numerator = (seA + seB) ** 2;
  const denominator = seA ** 2 / (nA - 1) + seB ** 2 / (nB - 1);
  const df = numerator / denominator;

  const pValue = twoTailedPFromT(Math.abs(t), df);

  return { tStatistic: t, degreesOfFreedom: df, pValue };
}

/* ═══════════════════════════════════════════════════════
   2. MANN-WHITNEY U TEST
   ═══════════════════════════════════════════════════════ */

/**
 * Mann-Whitney U test (Wilcoxon rank-sum) with normal approximation
 * and continuity correction. Suitable for large samples (n > 20).
 *
 * @param {number[]} a  Sample A values
 * @param {number[]} b  Sample B values
 * @returns {{ uStatistic: number, zScore: number, pValue: number }}
 */
export function mannWhitneyU(a, b) {
  const nA = a.length;
  const nB = b.length;

  // Combine and rank
  const combined = [
    ...a.map((v) => ({ value: v, group: 'a' })),
    ...b.map((v) => ({ value: v, group: 'b' })),
  ];
  combined.sort((x, y) => x.value - y.value);

  // Assign ranks with tie handling (average rank for ties)
  const ranks = assignRanks(combined);

  // Sum of ranks for group A
  let rankSumA = 0;
  for (let i = 0; i < combined.length; i++) {
    if (combined[i].group === 'a') {
      rankSumA += ranks[i];
    }
  }

  // U statistic for group A
  const uA = rankSumA - (nA * (nA + 1)) / 2;
  const uB = nA * nB - uA;
  const U = Math.min(uA, uB);

  // Normal approximation with continuity correction
  const meanU = (nA * nB) / 2;

  // Tie correction for variance
  const tieCorrectionFactor = computeTieCorrection(ranks);
  const N = nA + nB;
  const varU =
    (nA * nB * (N + 1)) / 12 -
    (nA * nB * tieCorrectionFactor) / (12 * N * (N - 1));

  const stdU = Math.sqrt(Math.max(varU, 0));

  if (stdU === 0) {
    return { uStatistic: U, zScore: 0, pValue: 1 };
  }

  // Continuity correction: subtract 0.5 from |U - meanU|
  const zScore = (Math.abs(U - meanU) - 0.5) / stdU;
  const pValue = 2 * (1 - normalCDF(zScore));

  return { uStatistic: U, zScore, pValue };
}

/* ═══════════════════════════════════════════════════════
   3. RUNTIME ESTIMATION
   ═══════════════════════════════════════════════════════ */

/**
 * Estimates additional days needed to reach statistical significance
 * at 80% power using the two-sample t-test sample size formula.
 *
 * Formula: n_per_arm = ((z_α/2 + z_β)² × (σ₁² + σ₂²)) / (μ₁ - μ₂)²
 *
 * @param {number} meanControl     Mean RPV of control
 * @param {number} meanVariant     Mean RPV of variant
 * @param {number} stdControl      Std dev of control RPV (zero-padded)
 * @param {number} stdVariant      Std dev of variant RPV (zero-padded)
 * @param {number} controlN        Total users in control
 * @param {number} variantN        Total users in variant
 * @param {number} daysRunning     Days the test has been running
 * @returns {number|null}          Additional days needed, or null if not estimable
 */
export function estimateAdditionalDays({
  meanControl,
  meanVariant,
  stdControl,
  stdVariant,
  controlN,
  variantN,
  daysRunning,
}) {
  const effectSize = Math.abs(meanControl - meanVariant);

  if (effectSize === 0) {
    return null; // Identical means → infinite sample needed
  }

  if (daysRunning <= 0) {
    return null;
  }

  const zSum = Z_ALPHA_TWO_TAILED + Z_BETA;
  const requiredPerArm =
    (zSum ** 2 * (stdControl ** 2 + stdVariant ** 2)) / effectSize ** 2;

  const currentPerArm = Math.min(controlN, variantN);
  const usersPerDay = (controlN + variantN) / daysRunning;

  if (usersPerDay <= 0) {
    return null;
  }

  const usersPerDayPerArm = usersPerDay / 2;
  const additionalUsersNeeded = Math.max(0, requiredPerArm - currentPerArm);
  const additionalDays = Math.ceil(additionalUsersNeeded / usersPerDayPerArm);

  return additionalDays;
}

/* ═══════════════════════════════════════════════════════
   4. ANALYSIS ORCHESTRATOR
   ═══════════════════════════════════════════════════════ */

/**
 * Runs the full analysis and returns a results object for the table.
 *
 * @param {{
 *   controlTransactions: number[],
 *   variantTransactions: number[],
 *   controlN: number,
 *   variantN: number,
 *   daysRunning: number,
 * }} params
 * @returns {{
 *   totalRevenue: { control: number, variant: number, lift: number },
 *   rpv: { control: number, variant: number, lift: number, welchP: number, mannWhitneyP: number, significant: boolean, additionalDays: number|null },
 *   aov: { control: number, variant: number, lift: number, welchP: number, significant: boolean, additionalDays: number|null },
 * }}
 */
export function runAnalysis({
  controlTransactions,
  variantTransactions,
  controlN,
  variantN,
  daysRunning,
}) {
  // ── Total Revenue ──
  const controlTotalRev = sum(controlTransactions);
  const variantTotalRev = sum(variantTransactions);
  const totalRevLift = computeLift(controlTotalRev, variantTotalRev);

  // ── RPV (zero-padded) ──
  const controlRPVArray = zeroPad(controlTransactions, controlN);
  const variantRPVArray = zeroPad(variantTransactions, variantN);

  const controlRPV = ssMean(controlRPVArray);
  const variantRPV = ssMean(variantRPVArray);
  const rpvLift = computeLift(controlRPV, variantRPV);

  const rpvWelch = welchTTest(controlRPVArray, variantRPVArray);
  const rpvMW = mannWhitneyU(controlRPVArray, variantRPVArray);
  const rpvSignificant =
    rpvWelch.pValue < SIGNIFICANCE_ALPHA ||
    rpvMW.pValue < SIGNIFICANCE_ALPHA;

  const rpvAdditionalDays = rpvSignificant
    ? 0
    : estimateAdditionalDays({
        meanControl: controlRPV,
        meanVariant: variantRPV,
        stdControl: ssStd(controlRPVArray),
        stdVariant: ssStd(variantRPVArray),
        controlN,
        variantN,
        daysRunning,
      });

  // ── AOV (purchasers only) ──
  const controlAOV = ssMean(controlTransactions);
  const variantAOV = ssMean(variantTransactions);
  const aovLift = computeLift(controlAOV, variantAOV);

  const aovWelch = welchTTest(controlTransactions, variantTransactions);
  const aovSignificant = aovWelch.pValue < SIGNIFICANCE_ALPHA;

  const aovAdditionalDays = aovSignificant
    ? 0
    : estimateAdditionalDays({
        meanControl: controlAOV,
        meanVariant: variantAOV,
        stdControl: ssStd(controlTransactions),
        stdVariant: ssStd(variantTransactions),
        controlN: controlTransactions.length,
        variantN: variantTransactions.length,
        daysRunning,
      });

  return {
    totalRevenue: {
      control: controlTotalRev,
      variant: variantTotalRev,
      lift: totalRevLift,
    },
    rpv: {
      control: controlRPV,
      variant: variantRPV,
      lift: rpvLift,
      welchP: rpvWelch.pValue,
      mannWhitneyP: rpvMW.pValue,
      significant: rpvSignificant,
      additionalDays: rpvAdditionalDays,
    },
    aov: {
      control: controlAOV,
      variant: variantAOV,
      lift: aovLift,
      welchP: aovWelch.pValue,
      mannWhitneyP: null, // Mann-Whitney not shown for AOV per spec
      significant: aovSignificant,
      additionalDays: aovAdditionalDays,
    },
  };
}

/* ═══════════════════════════════════════════════════════
   INTERNAL HELPERS
   ═══════════════════════════════════════════════════════ */

/**
 * Zero-pad an array of purchaser revenues to size N
 * (appending zeros for non-purchasers).
 */
function zeroPad(transactions, totalUsers) {
  const padCount = Math.max(0, totalUsers - transactions.length);
  return [...transactions, ...new Array(padCount).fill(0)];
}

/** Sum an array of numbers. */
function sum(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) total += arr[i];
  return total;
}

/** Compute lift as (variant - control) / control. */
function computeLift(control, variant) {
  if (control === 0) return variant === 0 ? 0 : Infinity;
  return (variant - control) / control;
}

/**
 * Assign average ranks to a sorted array, handling ties.
 * @param {{ value: number }[]} sorted  Sorted combined array
 * @returns {number[]}  Array of ranks (1-indexed)
 */
function assignRanks(sorted) {
  const n = sorted.length;
  const ranks = new Array(n);
  let i = 0;

  while (i < n) {
    let j = i;
    // Find the end of the tie group
    while (j < n && sorted[j].value === sorted[i].value) {
      j++;
    }
    // Average rank for this tie group
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[k] = avgRank;
    }
    i = j;
  }

  return ranks;
}

/**
 * Compute tie correction factor for Mann-Whitney variance.
 * Σ (tᵢ³ - tᵢ) for each group of tied ranks of size tᵢ.
 */
function computeTieCorrection(ranks) {
  const n = ranks.length;
  let correction = 0;
  let i = 0;

  while (i < n) {
    let j = i;
    while (j < n && ranks[j] === ranks[i]) {
      j++;
    }
    const tieSize = j - i;
    if (tieSize > 1) {
      correction += tieSize ** 3 - tieSize;
    }
    i = j;
  }

  return correction;
}

/**
 * Approximate the two-tailed p-value from a t-statistic
 * using the regularised incomplete beta function.
 *
 * This avoids needing a full t-distribution library.
 */
function twoTailedPFromT(t, df) {
  const x = df / (df + t * t);
  return regularisedIncompleteBeta(df / 2, 0.5, x);
}

/**
 * Standard normal CDF using the rational approximation
 * (Abramowitz & Stegun 26.2.17).
 */
function normalCDF(z) {
  if (z < -8) return 0;
  if (z > 8) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-0.5 * absZ * absZ);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Regularised incomplete beta function I_x(a, b) via continued fraction
 * (Lentz's method). Used for computing t-distribution p-values.
 */
function regularisedIncompleteBeta(a, b, x) {
  if (x < 0 || x > 1) return 0;
  if (x === 0 || x === 1) return x;

  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front =
    Math.exp(
      Math.log(x) * a + Math.log(1 - x) * b - lnBeta
    ) / a;

  // Use the continued fraction representation
  let result = betaCF(a, b, x);
  result = front * result;

  // If x < (a+1)/(a+b+2), we computed I_x(a,b) directly;
  // otherwise we used 1 - I_{1-x}(b,a).
  if (x < (a + 1) / (a + b + 2)) {
    return result;
  }
  return 1 - regularisedIncompleteBeta(b, a, 1 - x);
}

/**
 * Continued fraction for the incomplete beta function (Lentz's algorithm).
 */
function betaCF(a, b, x) {
  const MAX_ITER = 200;
  const EPS = 3e-12;
  const TINY = 1e-30;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;

  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;

    // Even step
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;

    // Odd step
    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < EPS) break;
  }

  return h;
}

/**
 * Log-gamma via Lanczos approximation (g = 7, n = 9).
 */
function lnGamma(z) {
  const g = 7;
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return (
      Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z)
    );
  }

  z -= 1;
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
