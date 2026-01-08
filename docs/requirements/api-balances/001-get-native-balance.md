# Get Native Balance

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can retrieve the current native cryptocurrency balance for a specific blockchain address. The response includes the balance in the chain's native token with USD value conversion based on current market prices.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a GET request to `/v2/balances/ecosystem/{ecosystem}/chain/{chain}/address/{address}/native` |
| **FR-2** | The system must fetch the current native balance from the blockchain node or data provider |
| **FR-3** | The response must include `balance` in the smallest unit (wei, satoshi, drops, etc.) |
| **FR-4** | The response must include `balanceFormatted` in human-readable format with proper decimal places |
| **FR-5** | The response must include `symbol` of the native token (ETH, BTC, XRP, etc.) |
| **FR-6** | The response must include `decimals` for the native token |
| **FR-7** | The response must include `usdValue` calculated using current CoinGecko price |
| **FR-8** | The response must include `priceUsd` for the current token price |
| **FR-9** | The response must include `lastUpdated` timestamp indicating when the balance was fetched |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to view balances for this address | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Ecosystem is not supported | 400 Bad Request | `ECOSYSTEM_NOT_SUPPORTED` | |
| **VR-4** | Chain is not supported for the specified ecosystem | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-5** | Address format is invalid for the specified chain | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-6** | Balance fetch from blockchain fails | 502 Bad Gateway | `BALANCE_FETCH_FAILED` | |
| **VR-7** | Price data unavailable (balance still returned without USD) | 200 OK | - | |
| **VR-8** | Successful retrieval | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Balance queries must complete within 3 seconds |
| **NFR-2** | The system should cache balances for 30 seconds to reduce RPC load |
| **NFR-3** | USD prices should be cached for 60 seconds |
| **NFR-4** | The system must support all chains in the chain registry |

## Supported Chains

See [001-list-chains.md](../api-chains/001-list-chains.md#currently-supported-chains) for the complete list of supported chains.

Native balance retrieval is supported for all ecosystems: EVM (Ethereum, Polygon, Arbitrum, Base, Fantom, Avalanche-C, BSC, Optimism), UTXO (Bitcoin), SVM (Solana), TVM (Tron), and XRP (Ripple).

## Open Questions

1. Should the response include historical balance data or just current?
