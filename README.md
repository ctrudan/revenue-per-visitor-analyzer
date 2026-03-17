# Revenue Per Visitor Analyzer

A client-side A/B test revenue analysis tool. Upload a GA4 transaction-level revenue CSV, provide user counts and test duration, and get a statistical comparison of control vs. variant performance.

## Metrics Computed

| Row | Description |
|-----|-------------|
| **Total Item Revenue** | Sum of all transaction values per arm |
| **Revenue Per Visitor (RPV)** | Total revenue / total users (non-purchasers zero-padded) |
| **Average Order Value (AOV)** | Mean transaction value among purchasers only |

## Statistical Methods

- **RPV**: Welch's t-test + Mann-Whitney U (both shown)
- **AOV**: Welch's t-test on purchasers only
- **Runtime estimate**: Two-sample t-test sample size formula (95% CI, 80% power)
- **Significance threshold**: p < 0.05

## Setup

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
# Output in dist/ — deploy to Netlify, Vercel, or any static host
```

## CSV Format

The app expects a GA4 transaction-level revenue export:

```
Segment,Control - Label,Variant 1 - Label,
Transaction ID,Item revenue,Item revenue,
,<total>,<total>,Grand total
<txn_id>,<amount>,0,
<txn_id>,0,<amount>,
...
```

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- simple-statistics
- PapaParse
- Client-side only (no backend, no localStorage)
