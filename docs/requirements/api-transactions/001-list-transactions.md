# List Address Transactions

**Status:** Draft
**Last Updated:** 2026-01-07

## Overview

Users can retrieve a paginated list of transactions for a specific blockchain address. Transactions are enriched with human-readable descriptions, classification data, and security scanning results. The list includes both sent and received transactions.

## Dependencies

- [Cursor-Based Pagination](../common/001-cursor-pagination.md) - Standard pagination implementation

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a GET request to `/v2/transactions/ecosystem/{ecosystem}/chain/{chain}/address/{address}` |
| **FR-2** | The system must implement cursor-based pagination as defined in [001-cursor-pagination](../common/001-cursor-pagination.md) |
| **FR-3** | Results must be sorted by block number and timestamp in descending order (newest first) |
| **FR-4** | Each transaction must include: `transactionHash`, `blockNumber`, `timestamp`, `direction` (`sent` or `received`) |
| **FR-5** | Each transaction must include raw data: `fromAddress`, `toAddress`, `gas`, `gasUsed`, `gasPrice`, `transactionFee` |
| **FR-6** | Each transaction must include classification data: `type`, `description`, `protocol`, `source` |
| **FR-7** | Each transaction must include transfer details: array of transfers with `action`, `from`, `to`, `amount`, `token` |
| **FR-8** | NFT transfers must include additional fields: `nft.name`, `nft.id`, `nft.symbol`, `nft.address` |
| **FR-9** | The system must support filtering by direction via `direction` query parameter (`sent`, `received`, `all`) |
| **FR-10** | The system must support filtering by date range via `fromDate` and `toDate` query parameters (ISO 8601 timestamps) |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to view transactions for this address | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Ecosystem is not supported | 400 Bad Request | `ECOSYSTEM_NOT_SUPPORTED` | |
| **VR-4** | Chain is not supported for the specified ecosystem | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-5** | Address format is invalid for the specified chain | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-6** | Direction filter value is invalid | 400 Bad Request | `VALIDATION_ERROR` | `ENUM_VALUE_INVALID` |
| **VR-7** | Date format is invalid | 400 Bad Request | `VALIDATION_ERROR` | `TIMESTAMP_OUT_OF_RANGE` |
| **VR-8** | fromDate is after toDate | 400 Bad Request | `DATE_RANGE_INVALID` | |
| **VR-9** | Pagination validation errors | See [001-cursor-pagination](../common/001-cursor-pagination.md#validation-requirements) | | |
| **VR-10** | Successful retrieval | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Transaction list queries must complete within 2 seconds |
| **NFR-2** | The system must use PostgreSQL with efficient indexes for address-scoped queries |
| **NFR-3** | Transaction data must support archival policies to manage storage costs for historical data |

## Supported Chains

See [001-list-chains.md](../api-chains/001-list-chains.md#currently-supported-chains) for the complete list of supported chains.

Transaction listing is supported for all ecosystems:
- **EVM chains**: Ethereum, Polygon, Arbitrum, Base, Fantom, Avalanche-C, BSC, Optimism
- **UTXO chains**: Bitcoin
- **SVM chains**: Solana
- **TVM chains**: Tron
- **XRP chains**: Ripple

## Open Questions

1. Should the API support filtering by transaction type (swap, transfer, liquidity, etc.)?
2. Should there be a separate endpoint for fetching a single transaction by hash?
