/**
 * parseCSV.js
 *
 * Parses the GA4 transaction-level revenue CSV into structured arrays
 * that the statistics module can consume.
 *
 * Expected CSV shape (flexible variant names):
 *   Row 1: Segment,<Control Label>,<Variant Label>[,]
 *   Row 2: Transaction ID,Item revenue,Item revenue[,]
 *   Row 3: ,<control total>,<variant total>,Grand total   ← skipped
 *   Rows 4+: <txn id>,<control rev>,<variant rev>[,]
 *
 * Returns { controlLabel, variantLabel, controlTransactions, variantTransactions }
 * where each transactions array contains the non-zero revenue values (purchasers only).
 */

import Papa from 'papaparse';
import { MIN_TRANSACTIONS_PER_ARM } from '../constants';

/**
 * @param {string} csvText  Raw CSV string from the uploaded file
 * @returns {{
 *   controlLabel: string,
 *   variantLabel: string,
 *   controlTransactions: number[],
 *   variantTransactions: number[],
 * }}
 * @throws {Error} With a user-friendly message on parse failure
 */
export function parseRevenueCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error('No CSV data provided. Please upload a valid file.');
  }

  const { data, errors } = Papa.parse(csvText.trim(), {
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    throw new Error(
      `CSV parsing error on row ${errors[0].row ?? '?'}: ${errors[0].message}`
    );
  }

  if (data.length < 4) {
    throw new Error(
      'CSV must contain at least 4 rows: segment header, metric label, grand total, and at least one transaction.'
    );
  }

  // --- Row 1: Segment headers ---
  const headerRow = data[0];
  const controlLabel = cleanLabel(headerRow[1]);
  const variantLabel = cleanLabel(headerRow[2]);

  if (!controlLabel || !variantLabel) {
    throw new Error(
      'Could not detect Control and Variant labels in the first row of the CSV. ' +
        'Expected format: Segment, <Control Name>, <Variant Name>'
    );
  }

  // --- Row 2: Metric label (informational, just validate it exists) ---
  const metricRow = data[1];
  if (!metricRow[1]?.toLowerCase().includes('revenue')) {
    throw new Error(
      `Expected "Item revenue" in row 2, but found "${metricRow[1] ?? '(empty)'}". ` +
        'Please check the CSV format.'
    );
  }

  // --- Rows 4+ (index 3+): Transaction data ---
  const controlTransactions = [];
  const variantTransactions = [];

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const controlVal = parseRevenue(row[1]);
    const variantVal = parseRevenue(row[2]);

    // Each transaction belongs to exactly one arm (the other is 0)
    if (controlVal > 0) {
      controlTransactions.push(controlVal);
    }
    if (variantVal > 0) {
      variantTransactions.push(variantVal);
    }
  }

  if (controlTransactions.length < MIN_TRANSACTIONS_PER_ARM) {
    throw new Error(
      `Control arm has only ${controlTransactions.length} transaction(s). ` +
        `Need at least ${MIN_TRANSACTIONS_PER_ARM} for meaningful analysis.`
    );
  }

  if (variantTransactions.length < MIN_TRANSACTIONS_PER_ARM) {
    throw new Error(
      `Variant arm has only ${variantTransactions.length} transaction(s). ` +
        `Need at least ${MIN_TRANSACTIONS_PER_ARM} for meaningful analysis.`
    );
  }

  return {
    controlLabel,
    variantLabel,
    controlTransactions,
    variantTransactions,
  };
}

/* ── Helpers ─────────────────────────────────────────── */

/**
 * Cleans a segment label by trimming whitespace.
 * @param {string|undefined} raw
 * @returns {string}
 */
function cleanLabel(raw) {
  return (raw ?? '').trim();
}

/**
 * Parses a revenue cell into a number. Returns 0 for empty / invalid values.
 * @param {string|undefined} raw
 * @returns {number}
 */
function parseRevenue(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  const cleaned = String(raw).replace(/[$,]/g, '').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}
