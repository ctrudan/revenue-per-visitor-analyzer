import { useState, useCallback } from 'react';
import FileUpload from './FileUpload';
import TestInputs from './TestInputs';
import ResultsTable from './ResultsTable';
import ErrorBanner from './ErrorBanner';
import { useAnalysis } from '../hooks/useAnalysis';

/**
 * Top-level app component.
 * Manages form state and delegates analysis to the useAnalysis hook.
 */
export default function App() {
  const [csvText, setCsvText] = useState(null);
  const [controlN, setControlN] = useState('');
  const [variantN, setVariantN] = useState('');
  const [daysRunning, setDaysRunning] = useState('');
  const [fileError, setFileError] = useState(null);

  const { results, error: analysisError, analyse, reset } = useAnalysis();

  const error = fileError || analysisError;

  const handleFileLoad = useCallback((text, err) => {
    if (err) {
      setFileError(err);
      setCsvText(null);
      return;
    }
    setFileError(null);
    setCsvText(text);
  }, []);

  const handleAnalyse = useCallback(() => {
    if (!csvText) {
      setFileError('Please upload a CSV file first.');
      return;
    }
    analyse(
      csvText,
      Number(controlN),
      Number(variantN),
      Number(daysRunning)
    );
  }, [csvText, controlN, variantN, daysRunning, analyse]);

  const handleReset = useCallback(() => {
    setCsvText(null);
    setControlN('');
    setVariantN('');
    setDaysRunning('');
    setFileError(null);
    reset();
  }, [reset]);

  const isFormComplete =
    csvText !== null &&
    controlN !== '' &&
    variantN !== '' &&
    daysRunning !== '';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
          Revenue Per Visitor Analyzer
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          Upload a GA4 transaction-level revenue CSV to compare control vs. variant
          performance on revenue metrics.
        </p>
      </header>

      {/* Input Section */}
      <div className="mb-6 space-y-5 rounded-xl border border-surface-200 bg-white p-5 shadow-sm sm:p-6">
        <FileUpload onFileLoad={handleFileLoad} disabled={false} />
        <TestInputs
          controlN={controlN}
          variantN={variantN}
          daysRunning={daysRunning}
          onControlNChange={setControlN}
          onVariantNChange={setVariantN}
          onDaysRunningChange={setDaysRunning}
          disabled={false}
        />

        {/* Error */}
        <ErrorBanner
          message={error}
          onDismiss={() => setFileError(null)}
        />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyse}
            disabled={!isFormComplete}
            className="
              rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white
              shadow-sm transition-all
              hover:bg-accent-dark hover:shadow-md
              focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none
            "
          >
            Run Analysis
          </button>
          {results && (
            <button
              onClick={handleReset}
              className="
                rounded-lg border border-surface-300 bg-white px-5 py-2.5
                text-sm font-medium text-surface-600
                transition-colors
                hover:bg-surface-50 hover:text-surface-800
                focus:outline-none focus:ring-2 focus:ring-surface-300 focus:ring-offset-2
              "
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-surface-800">
            Analysis Results
          </h2>
          <ResultsTable results={results} />
        </div>
      )}
    </div>
  );
}
