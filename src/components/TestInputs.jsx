import PropTypes from 'prop-types';

/**
 * Manual inputs for user counts and test duration.
 * These values come from the experimentation platform, not the CSV.
 */
export default function TestInputs({
  controlN,
  variantN,
  daysRunning,
  onControlNChange,
  onVariantNChange,
  onDaysRunningChange,
  disabled,
}) {
  const fields = [
    {
      id: 'controlN',
      label: 'Control N',
      value: controlN,
      onChange: onControlNChange,
      placeholder: 'e.g. 10484',
      help: 'Total users in control group',
    },
    {
      id: 'variantN',
      label: 'Variant N',
      value: variantN,
      onChange: onVariantNChange,
      placeholder: 'e.g. 10478',
      help: 'Total users in variant group',
    },
    {
      id: 'daysRunning',
      label: 'Days Running',
      value: daysRunning,
      onChange: onDaysRunningChange,
      placeholder: 'e.g. 14',
      help: 'How many days the test has been live',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {fields.map((field) => (
        <div key={field.id}>
          <label
            htmlFor={field.id}
            className="mb-1.5 block text-sm font-medium text-surface-600"
          >
            {field.label}
          </label>
          <input
            id={field.id}
            type="number"
            min="1"
            step="1"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className="
              w-full rounded-lg border border-surface-300 bg-white
              px-3 py-2 font-mono text-sm text-surface-800
              placeholder:text-surface-400
              transition-colors
              focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
              disabled:opacity-50
            "
          />
          <p className="mt-1 text-xs text-surface-400">{field.help}</p>
        </div>
      ))}
    </div>
  );
}

TestInputs.propTypes = {
  controlN: PropTypes.string.isRequired,
  variantN: PropTypes.string.isRequired,
  daysRunning: PropTypes.string.isRequired,
  onControlNChange: PropTypes.func.isRequired,
  onVariantNChange: PropTypes.func.isRequired,
  onDaysRunningChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
