# Get Token Balances

**Status:** Draft
**Last Updated:** 2026-01-07

## Overview

Users can retrieve all token balances for a specific blockchain address. The response includes ERC-20 tokens (on EVM chains), SPL tokens (on Solana), TRC-20 tokens (on Tron), and other chain-specific token standards with metadata and USD values.

## Dependencies

- [Cursor-Based Pagination](../common/001-cursor-pagination.md) - Standard pagination implementation (max limit: 200 for this endpoint)

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a GET request to `/v2/balances/ecosystem/{ecosystem}/chain/{chain}/address/{address}/tokens` |
| **FR-2** | The system must implement cursor-based pagination as defined in [001-cursor-pagination](../common/001-cursor-pagination.md) with max limit of 200 |
| **FR-3** | The system must return an array of all tokens held by the address with non-zero balance |
| **FR-4** | Each token must include: `contractAddress`, `symbol`, `name`, `decimals` |
| **FR-5** | Each token must include: `balance` (smallest unit), `balanceFormatted` (human-readable) |
| **FR-6** | Each token must include: `usdValue`, `priceUsd` when available from CoinGecko |
| **FR-7** | Each token may include: `logo` URL for display purposes |
| **FR-8** | Tokens should be sorted by USD value in descending order (highest value first) |
| **FR-9** | The response must include `totalUsdValue` aggregating all token values on the current page |
| **FR-10** | Hidden tokens (per address settings) should be excluded unless `includeHidden=true` |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to view balances for this address | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Ecosystem is not supported | 400 Bad Request | `ECOSYSTEM_NOT_SUPPORTED` | |
| **VR-4** | Chain is not supported for the specified ecosystem | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-5** | Address format is invalid for the specified chain | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-6** | Token balance fetch fails | 502 Bad Gateway | `BALANCE_FETCH_FAILED` | |
| **VR-7** | Pagination validation errors | See [001-cursor-pagination](../common/001-cursor-pagination.md#validation-requirements) | | |
| **VR-8** | Successful retrieval | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Token balance queries must complete within 5 seconds |
| **NFR-2** | Token metadata should be cached in PostgreSQL for 24 hours |
| **NFR-3** | The system must handle chains with thousands of tokens efficiently |
| **NFR-4** | USD prices should be fetched in batch to minimize CoinGecko API calls |

## Supported Chains

See [001-list-chains.md](../api-chains/001-list-chains.md#currently-supported-chains) for the complete list of supported chains.

Token balances are supported for chains that have token standards:
- **EVM chains**: ERC-20 tokens (Ethereum, Polygon, Arbitrum, Base, Fantom, Avalanche-C, BSC, Optimism)
- **SVM chains**: SPL tokens (Solana)
- **TVM chains**: TRC-20 tokens (Tron)

Note: UTXO chains (Bitcoin) and XRP (Ripple) do not have token standards and return empty token lists.

## Open Questions

1. Should the system support filtering by token type (verified, unverified, spam)?
2. Should NFT holdings be included or returned via a separate endpoint?
