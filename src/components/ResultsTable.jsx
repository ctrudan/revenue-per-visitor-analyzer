import PropTypes from 'prop-types';
import { CURRENCY_FORMAT, SIGNIFICANCE_ALPHA } from '../constants';

/**
 * Renders the analysis output table.
 *
 * Columns: Metric | Control | Variant | Lift % | Welch's T-Test P-Value |
 *          Mann-Whitney P-Value | Significant? | Est. Additional Days to Sig
 *
 * Rows: Total Item Revenue, Revenue Per Visitor, Average Order Value
 */
export default function ResultsTable({ results }) {
  if (!results) return null;

  const { totalRevenue, rpv, aov, controlLabel, variantLabel } = results;

  const rows = [
    {
      metric: 'Total Item Revenue',
      control: formatCurrency(totalRevenue.control),
      variant: formatCurrency(totalRevenue.variant),
      lift: totalRevenue.lift,
      welchP: null,
      mannWhitneyP: null,
      significant: null,
      additionalDays: null,
    },
    {
      metric: 'Revenue Per Visitor',
      control: formatCurrency(rpv.control),
      variant: formatCurrency(rpv.variant),
      lift: rpv.lift,
      welchP: rpv.welchP,
      mannWhitneyP: rpv.mannWhitneyP,
      significant: rpv.significant,
      additionalDays: rpv.additionalDays,
    },
    {
      metric: 'Average Order Value',
      control: formatCurrency(aov.control),
      variant: formatCurrency(aov.variant),
      lift: aov.lift,
      welchP: aov.welchP,
      mannWhitneyP: aov.mannWhitneyP,
      significant: aov.significant,
      additionalDays: aov.additionalDays,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Context bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-surface-500">
        <span>
          <span className="font-medium text-surface-700">Control:</span>{' '}
          {controlLabel} (N = {results.controlN.toLocaleString()}, {results.controlTransactionCount} purchasers)
        </span>
        <span>
          <span className="font-medium text-surface-700">Variant:</span>{' '}
          {variantLabel} (N = {results.variantN.toLocaleString()}, {results.variantTransactionCount} purchasers)
        </span>
        <span>
          <span className="font-medium text-surface-700">Duration:</span>{' '}
          {results.daysRunning} days
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-100/60">
              <th className="px-4 py-3 text-left font-semibold text-surface-700">Metric</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-700">Control</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-700">Variant</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-700">Lift %</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-700">
                Welch&apos;s T-Test
                <br />
                <span className="font-normal text-surface-400">P-Value</span>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-surface-700">
                Mann-Whitney
                <br />
                <span className="font-normal text-surface-400">P-Value</span>
              </th>
              <th className="px-4 py-3 text-center font-semibold text-surface-700">Significant?</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-700">
                Est. Additional Days
                <br />
                <span className="font-normal text-surface-400">to Sig (80% power)</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {rows.map((row) => (
              <tr
                key={row.metric}
                className="transition-colors hover:bg-surface-50"
              >
                <td className="px-4 py-3 font-medium text-surface-800">
                  {row.metric}
                </td>
                <td className="px-4 py-3 text-right font-mono text-surface-700">
                  {row.control}
                </td>
                <td className="px-4 py-3 text-right font-mono text-surface-700">
                  {row.variant}
                </td>
                <td className={`px-4 py-3 text-right font-mono font-medium ${liftColor(row.lift)}`}>
                  {formatLift(row.lift)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-surface-600">
                  {row.welchP !== null ? formatPValue(row.welchP) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-surface-600">
                  {row.mannWhitneyP !== null ? formatPValue(row.mannWhitneyP) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.significant !== null ? (
                    <SignificanceBadge significant={row.significant} />
                  ) : (
                    <span className="text-surface-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-surface-600">
                  {formatAdditionalDays(row.additionalDays, row.significant)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Methodology note */}
      <p className="text-xs leading-relaxed text-surface-400">
        RPV significance uses both Welch&apos;s t-test and Mann-Whitney U (non-purchasers zero-padded).
        AOV uses Welch&apos;s t-test on purchasers only.
        Significance threshold: p &lt; {SIGNIFICANCE_ALPHA}.
        Runtime estimate uses two-sample t-test sample size formula at 95% confidence / 80% power.
      </p>
    </div>
  );
}

/* ── Sub-components ─────────────────────────── */

function SignificanceBadge({ significant }) {
  return significant ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-semibold text-surface-500">
      <span className="h-1.5 w-1.5 rounded-full bg-surface-400" />
      No
    </span>
  );
}

SignificanceBadge.propTypes = {
  significant: PropTypes.bool.isRequired,
};

/* ── Formatters ─────────────────────────────── */

function formatCurrency(value) {
  return value.toLocaleString('en-US', CURRENCY_FORMAT);
}

function formatLift(lift) {
  if (lift === null || lift === undefined) return '—';
  if (!Number.isFinite(lift)) return '∞';
  const sign = lift >= 0 ? '+' : '';
  return `${sign}${(lift * 100).toFixed(2)}%`;
}

function liftColor(lift) {
  if (lift === null || lift === undefined || !Number.isFinite(lift)) return 'text-surface-500';
  if (lift > 0) return 'text-positive';
  if (lift < 0) return 'text-negative';
  return 'text-surface-500';
}

function formatPValue(p) {
  if (p < 0.0001) return '< 0.0001';
  return p.toFixed(4);
}

function formatAdditionalDays(days, significant) {
  if (significant === null) return '—';
  if (significant) return '0';
  if (days === null) return 'N/A';
  return days.toLocaleString();
}

ResultsTable.propTypes = {
  results: PropTypes.shape({
    controlLabel: PropTypes.string.isRequired,
    variantLabel: PropTypes.string.isRequired,
    controlN: PropTypes.number.isRequired,
    variantN: PropTypes.number.isRequired,
    daysRunning: PropTypes.number.isRequired,
    controlTransactionCount: PropTypes.number.isRequired,
    variantTransactionCount: PropTypes.number.isRequired,
    totalRevenue: PropTypes.shape({
      control: PropTypes.number.isRequired,
      variant: PropTypes.number.isRequired,
      lift: PropTypes.number.isRequired,
    }).isRequired,
    rpv: PropTypes.shape({
      control: PropTypes.number.isRequired,
      variant: PropTypes.number.isRequired,
      lift: PropTypes.number.isRequired,
      welchP: PropTypes.number.isRequired,
      mannWhitneyP: PropTypes.number.isRequired,
      significant: PropTypes.bool.isRequired,
      additionalDays: PropTypes.number,
    }).isRequired,
    aov: PropTypes.shape({
      control: PropTypes.number.isRequired,
      variant: PropTypes.number.isRequired,
      lift: PropTypes.number.isRequired,
      welchP: PropTypes.number.isRequired,
      significant: PropTypes.bool.isRequired,
      additionalDays: PropTypes.number,
    }).isRequired,
  }),
};
