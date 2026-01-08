# List Supported Chains

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can retrieve a list of all blockchain networks supported by the system. The response includes chain metadata, native token information, and ecosystem classification. This enables clients to build dynamic chain selection interfaces.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a GET request to `/v2/chains` |
| **FR-2** | The response must include an array of all supported chains |
| **FR-3** | Each chain must include: `chainId` (unique identifier), `name` (display name), `ecosystem` |
| **FR-4** | Each chain must include native coin information: `nativeCoin.symbol`, `nativeCoin.name`, `nativeCoin.decimals` |
| **FR-5** | Each chain must include: `isTestnet` boolean indicating mainnet vs. testnet |
| **FR-6** | Each chain must include: `explorerUrl` for transaction/address lookups |
| **FR-7** | Each chain may include: `iconUrl` for display purposes |
| **FR-8** | The system must support filtering by `ecosystem` query parameter (evm, utxo, svm, tvm, xrp, substrate) |
| **FR-9** | The system must support filtering by `isTestnet` query parameter (true, false) |
| **FR-10** | Results should be sorted alphabetically by chain name |
| **FR-11** | Each chain must include: `supportedCurves` array listing compatible cryptographic curves |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | Ecosystem filter value is invalid | 400 Bad Request | `VALIDATION_ERROR` | `ENUM_VALUE_INVALID` |
| **VR-3** | isTestnet filter is not a valid boolean | 400 Bad Request | `VALIDATION_ERROR` | `ENUM_VALUE_INVALID` |
| **VR-4** | Successful retrieval | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Chain list must be returned within 500ms |
| **NFR-2** | Chain data should be cached as it changes infrequently |
| **NFR-3** | The system must support 50+ chains across all ecosystems |

## Open Questions

1. Should chain status (maintenance, degraded) be included in the response?
2. Should gas price recommendations be included per chain?

---

## Supported Ecosystems

| Ecosystem | Description | Example Chains |
|-----------|-------------|----------------|
| `evm` | Ethereum Virtual Machine compatible | Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche, Fantom |
| `utxo` | Unspent Transaction Output model | Bitcoin, Litecoin, Dogecoin, Bitcoin SV, MNEE |
| `svm` | Solana Virtual Machine | Solana |
| `tvm` | Tron Virtual Machine | Tron |
| `xrp` | XRP Ledger | Ripple (XRP) |
| `substrate` | Substrate/Polkadot-based | Polkadot, Kusama, Bittensor |

## Currently Supported Chains

The following chains are fully supported for address monitoring, balance fetching, and transaction listing:

### EVM Chains

| Chain Alias | Chain ID | Native Token | Explorer |
|-------------|----------|--------------|----------|
| `eth` | 1 | ETH | etherscan.io |
| `polygon` | 137 | POL | polygonscan.com |
| `arbitrum` | 42161 | ETH | arbiscan.io |
| `base` | 8453 | ETH | basescan.org |
| `fantom` | 250 | FTM | ftmscan.com |
| `avalanche-c` | 43114 | AVAX | snowtrace.io |
| `bsc` | 56 | BNB | bscscan.com |
| `optimism` | 10 | ETH | optimistic.etherscan.io |

### UTXO Chains

| Chain Alias | Native Token | Explorer |
|-------------|--------------|----------|
| `bitcoin` | BTC | blockchain.com |

### SVM Chains

| Chain Alias | Native Token | Explorer |
|-------------|--------------|----------|
| `solana` | SOL | solscan.io |

### TVM Chains

| Chain Alias | Native Token | Explorer |
|-------------|--------------|----------|
| `tron` | TRX | tronscan.org |

### XRP Chains

| Chain Alias | Native Token | Explorer |
|-------------|--------------|----------|
| `ripple` | XRP | xrpscan.com |
