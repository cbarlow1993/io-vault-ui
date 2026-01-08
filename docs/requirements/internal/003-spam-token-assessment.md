# Spam Token Assessment

**Status:** Accepted
**Last Updated:** 2026-01-07

## Overview

The Spam Token Assessment system identifies potentially malicious, spam, or scam tokens using multiple data sources. It aggregates signals from Blockaid security scanning, CoinGecko listing status, and heuristic analysis to provide a comprehensive risk assessment. The system allows user overrides and computes an overall risk summary for frontend display.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall classify tokens using three independent providers: Blockaid, CoinGecko, and Heuristics. |
| **FR-2** | Provider calls shall execute in parallel to minimize latency. |
| **FR-3** | Provider failures shall be handled gracefully without failing the entire classification. |
| **FR-4** | The system shall merge results from all providers into a unified `SpamClassification` structure. |
| **FR-5** | The system shall support batch classification for processing multiple tokens efficiently. |
| **FR-6** | The system shall compute a risk summary with levels: `safe`, `warning`, or `danger`. |
| **FR-7** | User overrides (`trusted` or `spam`) shall take precedence over all automated classifications. |
| **FR-8** | The system shall provide human-readable reasons explaining the risk assessment. |

## Provider Specifications

### Blockaid Provider

| ID | Requirement |
|----|-------------|
| **BP-1** | Shall call Blockaid Token Security API to scan token contracts. |
| **BP-2** | Shall identify malicious tokens (result_type = 'Malicious'). |
| **BP-3** | Shall detect phishing/impersonation attacks from attack_types. |
| **BP-4** | Shall capture risk score (0-1) when available. |
| **BP-5** | Shall return null for unsupported chains or native tokens. |
| **BP-6** | Shall map chain identifiers to Blockaid's supported chain format. |

### CoinGecko Provider

| ID | Requirement |
|----|-------------|
| **CP-1** | Shall determine if token is listed on CoinGecko. |
| **CP-2** | Shall capture market cap rank when available. |
| **CP-3** | Shall leverage existing coingecko_id from token metadata when present. |

### Heuristics Provider

| ID | Requirement |
|----|-------------|
| **HP-1** | Shall analyze token name and symbol for suspicious patterns. |
| **HP-2** | Shall detect URL patterns in token names (e.g., "claim-rewards.xyz"). |
| **HP-3** | Shall detect unicode confusables (e.g., "USÐC" impersonating "USDC"). |
| **HP-4** | Shall detect known scam phrases and impersonation attempts. |
| **HP-5** | Shall flag unsolicited tokens (airdrop detection) when data available. |
| **HP-6** | Shall check contract age and flag very new contracts (< 7 days). |
| **HP-7** | Shall analyze holder distribution for suspicious concentration. |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Blockaid API unavailable | Returns `blockaid: null`, continues with other providers | - | |
| **VR-2** | Token address is 'native' | Skips Blockaid scan, returns null | - | |
| **VR-3** | Chain not supported by Blockaid | Returns `blockaid: null` silently | - | |
| **VR-4** | User override is 'trusted' | Risk level = 'safe' regardless of signals | - | |
| **VR-5** | User override is 'spam' | Risk level = 'danger' regardless of signals | - | |
| **VR-6** | Classification succeeds | Returns complete ClassificationResult | - | |

## Risk Level Computation

| Condition | Risk Level |
|-----------|------------|
| User override = 'trusted' | `safe` |
| User override = 'spam' | `danger` |
| Blockaid isMalicious = true | `danger` |
| Blockaid isPhishing = true | `danger` |
| Any warning signal present | `warning` |
| No signals detected | `safe` |

### Warning Signals

- Suspicious token name detected
- Token received without user transaction (unsolicited/airdrop)
- Very new token contract (< 7 days)
- Suspicious holder distribution
- Not listed on CoinGecko (only counts if other issues exist)

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Individual token classification shall complete within 2 seconds under normal conditions. |
| **NFR-2** | Batch classification shall process tokens concurrently for efficiency. |
| **NFR-3** | Classification results shall be cacheable with configurable TTL (default: 24 hours). |
| **NFR-4** | Provider timeouts shall not block other providers from completing. |
| **NFR-5** | The system shall log provider failures with token and chain context for debugging. |

## Data Model

### SpamClassification Structure

```typescript
interface SpamClassification {
  blockaid: {
    isMalicious: boolean;
    isPhishing: boolean;
    riskScore: number | null;
    attackTypes: string[];
    checkedAt: string;
    resultType: 'Benign' | 'Warning' | 'Malicious' | 'Spam';
    rawResponse: TokenScanResponse | null;
  } | null;
  coingecko: {
    isListed: boolean;
    marketCapRank: number | null;
  };
  heuristics: {
    suspiciousName: boolean;
    namePatterns: string[];
    isUnsolicited: boolean;
    contractAgeDays: number | null;
    isNewContract: boolean;
    holderDistribution: 'normal' | 'suspicious' | 'unknown';
  };
}
```

### SpamAnalysis Response (Full)

```typescript
interface SpamAnalysis {
  blockaid: BlockaidClassification | null;
  coingecko: CoingeckoClassification;
  heuristics: HeuristicsClassification;
  userOverride: 'trusted' | 'spam' | null;
  classificationUpdatedAt: string | null;
  summary: {
    riskLevel: 'safe' | 'warning' | 'danger';
    reasons: string[];
  };
}
```

## Open Questions

1. **Contract age data source** - Currently not implemented. Need to determine whether to use archive node RPC or explorer API.
2. **Holder distribution analysis** - Currently returns 'unknown'. Need to identify which explorer APIs support holder stats per chain.

---

## Implementation Status

### Completed Components

| Component | Location | Status |
|-----------|----------|--------|
| SpamClassificationService | `src/services/spam/spam-classification-service.ts` | Complete |
| BlockaidProvider | `src/services/spam/providers/blockaid-provider.ts` | Complete |
| CoingeckoProvider | `src/services/spam/providers/coingecko-provider.ts` | Complete |
| HeuristicsProvider | `src/services/spam/providers/heuristics-provider.ts` | Partial |
| NameAnalyzer | `src/services/spam/heuristics/name-analyzer.ts` | Complete |
| Type Definitions | `src/services/spam/types.ts` | Complete |

### Partial Implementation Notes

The HeuristicsProvider has the following incomplete features:
- `isUnsolicited` - Always returns `false` (airdrop detection TODO)
- `contractAgeDays` - Always returns `null` (contract age checking TODO)
- `isNewContract` - Always returns `false` (depends on contract age)
- `holderDistribution` - Always returns `'unknown'` (holder analysis TODO)

### Test Coverage

| Test File | Coverage |
|-----------|----------|
| `tests/unit/services/spam/spam-classification-service.test.ts` | Service orchestration |
| `tests/unit/services/spam/providers/blockaid-provider.test.ts` | Blockaid integration |
| `tests/unit/services/spam/providers/heuristics-provider.test.ts` | Heuristic analysis |
| `tests/unit/services/spam/heuristics/name-analyzer.test.ts` | Name pattern detection |
