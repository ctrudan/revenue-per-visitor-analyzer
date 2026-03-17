import { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * CSV file upload with drag-and-drop support.
 * Reads the file as text and passes it to the parent via onFileLoad.
 */
export default function FileUpload({ onFileLoad, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  const readFile = useCallback(
    (file) => {
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.csv')) {
        onFileLoad(null, 'Please upload a .csv file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFileName(file.name);
        onFileLoad(e.target.result, null);
      };
      reader.onerror = () => {
        onFileLoad(null, 'Failed to read the file. Please try again.');
      };
      reader.readAsText(file);
    },
    [onFileLoad]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      readFile(file);
    },
    [readFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      readFile(file);
    },
    [readFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-surface-600">
        Revenue CSV
      </label>
      <button
        type="button"
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={disabled}
        className={`
          flex w-full cursor-pointer flex-col items-center justify-center
          rounded-lg border-2 border-dashed px-6 py-8
          text-sm transition-all
          ${
            isDragging
              ? 'border-accent bg-blue-50 text-accent'
              : fileName
                ? 'border-positive/40 bg-emerald-50/50 text-surface-700'
                : 'border-surface-300 bg-white text-surface-500 hover:border-surface-400 hover:bg-surface-50'
          }
          ${disabled ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        {fileName ? (
          <>
            <svg className="mb-2 h-6 w-6 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-surface-800">{fileName}</span>
            <span className="mt-1 text-xs text-surface-400">Click or drop to replace</span>
          </>
        ) : (
          <>
            <svg className="mb-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="font-medium">Drop CSV here or click to browse</span>
            <span className="mt-1 text-xs">GA4 transaction-level revenue export</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
      />
    </div>
  );
}

FileUpload.propTypes = {
  onFileLoad: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
