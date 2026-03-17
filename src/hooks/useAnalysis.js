/**
 * useAnalysis.js
 *
 * Custom hook that bridges CSV parsing and statistical analysis.
 * Keeps components thin by owning all business logic orchestration.
 *
 * Flow: csvFile → parse → validate inputs → runAnalysis → results
 */

import { useState, useCallback } from 'react';
import { parseRevenueCSV } from '../utils/parseCSV';
import { runAnalysis } from '../utils/statistics';

/**
 * @returns {{
 *   results: object|null,
 *   parsedData: object|null,
 *   error: string|null,
 *   isAnalysed: boolean,
 *   analyse: (file: File, controlN: number, variantN: number, daysRunning: number) => void,
 *   reset: () => void,
 * }}
 */
export function useAnalysis() {
  const [results, setResults] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);

  const reset = useCallback(() => {
    setResults(null);
    setParsedData(null);
    setError(null);
  }, []);

  const analyse = useCallback((csvText, controlN, variantN, daysRunning) => {
    setError(null);
    setResults(null);

    try {
      // Validate numeric inputs
      if (!Number.isFinite(controlN) || controlN <= 0) {
        throw new Error('Control N must be a positive number.');
      }
      if (!Number.isFinite(variantN) || variantN <= 0) {
        throw new Error('Variant N must be a positive number.');
      }
      if (!Number.isFinite(daysRunning) || daysRunning <= 0) {
        throw new Error('Days Running must be a positive number.');
      }

      // Parse CSV
      const parsed = parseRevenueCSV(csvText);
      setParsedData(parsed);

      // Sanity check: purchasers shouldn't exceed total users
      if (parsed.controlTransactions.length > controlN) {
        throw new Error(
          `Control has ${parsed.controlTransactions.length} transactions but only ${controlN} users. ` +
            'Control N must be ≥ the number of control transactions in the CSV.'
        );
      }
      if (parsed.variantTransactions.length > variantN) {
        throw new Error(
          `Variant has ${parsed.variantTransactions.length} transactions but only ${variantN} users. ` +
            'Variant N must be ≥ the number of variant transactions in the CSV.'
        );
      }

      // Run analysis
      const analysisResults = runAnalysis({
        controlTransactions: parsed.controlTransactions,
        variantTransactions: parsed.variantTransactions,
        controlN,
        variantN,
        daysRunning,
      });

      setResults({
        ...analysisResults,
        controlLabel: parsed.controlLabel,
        variantLabel: parsed.variantLabel,
        controlN,
        variantN,
        daysRunning,
        controlTransactionCount: parsed.controlTransactions.length,
        variantTransactionCount: parsed.variantTransactions.length,
      });
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during analysis.');
      setResults(null);
    }
  }, []);

  return {
    results,
    parsedData,
    error,
    isAnalysed: results !== null,
    analyse,
    reset,
  };
}
