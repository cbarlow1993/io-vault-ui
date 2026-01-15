# Token Analytics Dashboard Design

## Overview

Add an analytics section to the token detail Overview tab with three charts showing supply over time, transaction volume, and holder growth.

## Layout

```
┌─────────────────────────────────────────────────┐
│ Token Properties    │    Deployment Info        │  (existing)
├─────────────────────────────────────────────────┤
│              Quick Actions                      │  (existing)
├─────────────────────────────────────────────────┤
│  Analytics          [30D] [90D] [All]          │  (new)
├─────────────────────┬───────────────────────────┤
│  Supply Over Time   │   Transaction Volume      │
│  (line chart)       │   (bar chart)             │
├─────────────────────┴───────────────────────────┤
│              Holder Growth                      │
│              (line chart, full width)           │
└─────────────────────────────────────────────────┘
```

## Charts

1. **Supply Over Time** - Line chart showing total supply changes
2. **Transaction Volume** - Stacked bar chart (mint/burn/transfer counts)
3. **Holder Growth** - Line chart showing holder count over time

## Time Ranges

- 30D (default)
- 90D
- All time

## Tech Stack

- Recharts library for React-based charts
- Mock data generated for ~90 days of history

## Color Palette

- Supply line: terminal-500 (#14b8a6)
- Mint bars: positive-500 (#22c55e)
- Burn bars: negative-500 (#ef4444)
- Transfer bars: neutral-500 (#6b7280)
- Holder line: terminal-600 (#0d9488)

## Files

- `src/features/tokenisation/components/token-analytics-section.tsx`
- `src/features/tokenisation/components/charts/supply-chart.tsx`
- `src/features/tokenisation/components/charts/transaction-volume-chart.tsx`
- `src/features/tokenisation/components/charts/holder-growth-chart.tsx`
- `src/features/tokenisation/data/mock-data.ts` (modified)
- `src/features/tokenisation/page-token-detail.tsx` (modified)
