# Compliance Feature Design

## Overview

A comprehensive compliance module for reviewing crypto transactions flowing through wallet addresses. Integrates with third-party compliance providers (ChainAnalysis, Elliptic, Scorechain) using customer-provided API keys.

## Users & Roles

| Role | Description |
|------|-------------|
| **Compliance Officer (L1)** | First-level reviewer — can approve, reject, or escalate transactions |
| **Senior Compliance Officer (L2)** | Second-level reviewer — handles escalated transactions, manages integrations |
| **Treasury Manager** | View-only access with ability to add notes/context to assist reviews |

### Permission Matrix

| Capability | L1 Officer | L2 Officer | Treasury Manager |
|------------|------------|------------|------------------|
| View Dashboard | ✓ | ✓ | ✓ |
| View Transactions | ✓ | ✓ | ✓ |
| View Addresses | ✓ | ✓ | ✓ |
| Claim Transaction | ✓ | ✓ | ✗ |
| Approve (L1) | ✓ | ✓ | ✗ |
| Reject | ✓ | ✓ | ✗ |
| Escalate to L2 | ✓ | ✓ | ✗ |
| Approve (L2 items) | ✗ | ✓ | ✗ |
| Add Notes | ✓ | ✓ | ✓ |
| Manage Watchlist | ✓ | ✓ | ✗ |
| Generate Reports | ✓ | ✓ | Read-only |
| Configure Alerts | Own only | All | Own only |
| Manage Integrations | ✗ | ✓ | ✗ |

## Integration Model

### Supported Providers

- ChainAnalysis
- Elliptic
- Scorechain

### Bring Your Own Keys

Customers configure their own API keys for each provider they use. Not all customers will have all providers.

### First-Time Setup Flow

When a user with compliance permissions accesses the module with no integrations configured:

1. Welcome screen explaining the module requires at least one provider
2. Provider selection — checkboxes for each provider
3. API key entry — credential fields for each selected provider
4. Connection test — validate keys before saving
5. Confirmation — summary of configured providers

### Organisation Settings → Integrations

A dedicated page listing all three providers as cards:

- Provider logo and name
- Status indicator (Connected / Not Configured)
- Configure or Edit button
- Last successful sync timestamp
- Test connection and remove options

### Provider Display

When multiple providers are configured, results are displayed **side-by-side** for comparison. Compliance officers interpret assessments from each source independently.

## Transaction Workflow

### All Transactions Require Approval

Every crypto transaction must pass through compliance review before execution.

### Transaction Types

- **Receive** — incoming transactions
- **Send** — outgoing transactions
- **Swap** — token exchange transactions

### Transaction States

| State | Description |
|-------|-------------|
| `Pending L1` | New transaction awaiting first-level review |
| `Under L1 Review` | L1 reviewer has claimed the transaction |
| `Pending L2` | Escalated, awaiting second-level review |
| `Under L2 Review` | L2 reviewer has claimed the transaction |
| `Approved` | Cleared for execution |
| `Rejected` | Blocked with reason recorded |

### Auto-Escalation Rules

Configurable rules that automatically escalate to L2:

- Transaction value exceeds threshold (e.g., >$100,000)
- Any provider returns High Risk or Severe rating
- Address is on internal watchlist
- Counterparty jurisdiction is flagged

### Reviewer Actions

**L1 Reviewer:**
- Approve — clears the transaction
- Reject — blocks with mandatory reason
- Escalate — sends to L2 with optional notes
- Request Info — adds note requesting context from Treasury Manager

**L2 Reviewer:**
- Same as L1, plus ability to override auto-escalation rules

**Treasury Manager:**
- View transaction and compliance details
- Add notes/context to assist review

## Navigation Structure

Compliance is a **separate module** with its own sub-navigation:

```
Compliance
├── Dashboard      — Metrics, trends, KPIs
├── Transactions   — Review queue + history
├── Addresses      — Address compliance profiles
├── Reports        — Generate & view reports
└── Alerts         — Notification center + config
```

### Routes

| Route | Purpose |
|-------|---------|
| `/compliance` | Dashboard |
| `/compliance/transactions` | Transaction list (filterable, default: pending) |
| `/compliance/transactions/:id` | Transaction detail + review actions |
| `/compliance/addresses` | Address list with risk indicators |
| `/compliance/addresses/:id` | Address dossier |
| `/compliance/reports` | Report templates + generated reports |
| `/compliance/reports/new/:type` | Generate a specific report |
| `/compliance/reports/:id` | View generated report |
| `/compliance/alerts` | Notification feed + alert config |

## Page Designs

### Dashboard

Metrics-focused view with risk overview, trends, and KPIs prominent. Queue accessible but secondary.

**Top Section — Key Metrics (4 cards):**
- Pending Reviews — count with L1/L2 breakdown
- Avg Review Time — with trend indicator
- Approval Rate — percentage this period
- High Risk Alerts — count this period

**Middle Section — Trends (2 columns):**
- Transaction Volume Chart — daily/weekly, stacked by risk level
- Risk Distribution — donut chart of risk breakdown

**Bottom Section — Quick Access (2 columns):**
- Recent Activity Feed — latest compliance actions
- Requires Attention — oldest pending + auto-escalated items

**Filters:**
Time period selector (Today, 7 days, 30 days, Custom)

### Transactions List

**Top Bar:**
- Filter chips: Status (Pending L1, Pending L2, Under Review, Approved, Rejected, All)
- Search box (transaction hash, wallet address, amount)
- Date range picker

**Table Columns:**
- Transaction Hash (truncated, clickable)
- Type (Receive / Send / Swap)
- Amount (value + token symbol)
- Wallet (full address, not truncated)
- Chain (Ethereum, Bitcoin, Polygon, etc.)
- Risk (Low/Medium/High badge)
- Status (workflow state badge)
- Submitted (timestamp)
- Reviewer (assigned or Unassigned)

**Default Sort:** Oldest pending first

### Transaction Detail

**Left Column (60%):**
- Transaction summary card (type, amount, token, from/to addresses, chain, block, timestamp)
- Provider Assessments — side-by-side cards per provider (risk score, categories, flags)
- Timeline — chronological audit trail

**Right Column (40%):**
- Status card with current state and reviewer
- Action buttons (Approve, Reject, Escalate, Request Info)
- Notes section with Add Note input

### Addresses List

**Top Bar:**
- Filter chips: Risk Level (All, Low, Medium, High, Severe)
- Search box (wallet address)
- Chain filter dropdown

**Table Columns:**
- Wallet Address (full, clickable)
- Chain
- Risk Level (badge)
- Transaction Count
- Last Activity
- Watchlist (icon indicator)

### Address Dossier

**Header:**
- Full wallet address with copy button
- Chain badge
- Overall risk level (prominent)
- Watchlist toggle button

**Section 1 — Risk Profile:**
Provider risk scores side-by-side (logo, score, categories, last checked)

**Section 2 — Counterparty Analysis:**
List of transacted addresses with: full address, chain, risk level, transaction count, total volume

**Section 3 — Transaction Patterns:**
- Volume over time chart
- Frequency metrics
- Anomaly indicators
- Breakdown by type (Receive/Send/Swap)

**Section 4 — Transaction History:**
Paginated list filtered to this address

### Reports Hub

**Report Templates (4 cards):**

| Template | Description |
|----------|-------------|
| Transaction Summary | All transactions with compliance status, amounts, outcomes |
| Risk Exposure | Aggregate risk metrics by chain and risk level |
| Flagged Activity | Rejected, escalated, high-risk transactions with reasons |
| Audit Trail | Complete reviewer action log |

**Generated Reports Table:**
- Report Name, Type, Date Range, Generated By, Created At
- Actions: View, Download (PDF/CSV)

### Generate Report

**Form:**
- Date range picker (required)
- Chain filter (optional)
- Risk level filter (optional)
- Status filter (optional)

**Preview:** Summary of what report will include

### Alerts Page

**Tab 1: Notification Feed**
- Reverse-chronological alert cards
- Each shows: type icon, title, description, timestamp, read status, link
- Filters: Type, Read/Unread, Date range
- Bulk "Mark All as Read"

**Tab 2: Alert Rules**

**Notification Channels:**
- In-App: Always on
- Email: Toggle with address input
- Webhooks: Add/Edit/Delete endpoints

**Webhook Config Modal:**
- Name, URL, optional auth header, test button

**Alert Triggers (per channel):**
- New transaction pending review
- Transaction auto-escalated to L2
- High risk score detected
- Transaction approved
- Transaction rejected
- Watchlist address activity

## Visual Design

Matches Treasury-6 design system:
- Same components, colors, and styling as the rest of the app
- Consistent use of badges for status and risk levels
- Full wallet addresses displayed (no truncation)

## Technical Integration

### RBAC Extension

Extend `permissions.ts` with `compliance` statement:

```typescript
const statement = {
  // existing...
  compliance: {
    view: boolean,
    reviewL1: boolean,
    reviewL2: boolean,
    manageWatchlist: boolean,
    generateReports: boolean,
    configureAlerts: boolean,
    manageIntegrations: boolean,
  }
} as const;
```

### New Routes

Add route group under `/compliance` with authenticated guard and compliance permission checks.

### Provider Integration

Create abstraction layer for compliance providers:
- Common interface for risk assessment requests
- Provider-specific adapters (ChainAnalysis, Elliptic, Scorechain)
- Credential storage in organisation settings
- Rate limiting and caching

### Notifications

- In-app: Extend existing notification system
- Email: Use existing email service
- Webhooks: New webhook dispatch service

## Future Considerations (Out of Scope)

- Provider Comparison report template
- Custom report builder
- Bulk transaction review actions
- API for external compliance system integration
