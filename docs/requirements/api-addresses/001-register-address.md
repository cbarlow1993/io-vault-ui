# Register Address for Monitoring

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can register a blockchain address for transaction monitoring within a vault. The system subscribes to real-time transaction updates from blockchain data providers (Noves, Tatum) and begins tracking activity on the address. Each address is validated against the vault's supported curves and chain-specific format requirements.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a POST request to `/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chain}` |
| **FR-2** | The request body must include the `address` field containing the blockchain address to monitor |
| **FR-3** | The request body may include an optional `alias` field (1-64 characters) for human-readable identification |
| **FR-4** | The request body may include an optional `derivationPath` field for HD wallet addresses (BIP-32 format) |
| **FR-5** | The system must validate the address format according to chain-specific rules (e.g., EVM addresses must be valid checksummed hex, UTXO addresses must match network encoding) |
| **FR-6** | The system must verify the address is compatible with the vault's configured cryptographic curves |
| **FR-7** | The system must check that the address is not already registered as an address |
| **FR-9** | The system must store the address record with status `isMonitored` and current timestamp in `monitoredAt` if `monitor` = `true` on creation |
| **FR-10** | The system must initiate token discovery for the address to populate the initial token list |
| **FR-11** | The response must include the registered address details including `address`, `chain`, `ecosystem`, `vaultId`, `monitoredAt`, and `subscriptionId` |
| **FR-12** | The system must associate the address with the user's `organisationId` from the authentication context, including the workspace |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to register addresses in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | Address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-5** | Ecosystem is not supported | 400 Bad Request | `ECOSYSTEM_NOT_SUPPORTED` | |
| **VR-6** | Chain is not supported for the specified ecosystem | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-7** | Address format is invalid for the specified chain | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-8** | Address is not compatible with vault's cryptographic curves | 400 Bad Request | `ADDRESS_CURVE_INCOMPATIBLE` | |
| **VR-9** | Address is already registered for monitoring in this vault | 409 Conflict | `ADDRESS_ALREADY_MONITORED` | |
| **VR-10** | Alias exceeds 64 characters | 400 Bad Request | `VALIDATION_ERROR` | `STRING_LENGTH_INVALID` |
| **VR-11** | Derivation path format is invalid | 400 Bad Request | `VALIDATION_ERROR` | `DERIVATION_PATH_FORMAT_INVALID` |
| **VR-12** | Subscription to blockchain data provider fails | 502 Bad Gateway | `SUBSCRIPTION_FAILED` | |
| **VR-13** | Successful registration | 201 Created | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Address registration must complete within 5 seconds including subscription setup |
| **NFR-2** | The system must support all ecosystems: EVM, UTXO, SVM, TVM, XRP, Substrate |
| **NFR-3** | The system must enforce rate limiting per vault to prevent abuse |
| **NFR-4** | Failed subscription attempts must be logged with correlation IDs for debugging |

## Supported Chains

See [001-list-chains.md](../api-chains/001-list-chains.md#currently-supported-chains) for the complete list of supported chains.

### Summary of Supported Ecosystems

| Ecosystem | Chains |
|-----------|--------|
| **EVM** | Ethereum, Polygon, Arbitrum, Base, Fantom, Avalanche-C, BSC, Optimism |
| **UTXO** | Bitcoin |
| **SVM** | Solana |
| **TVM** | Tron |
| **XRP** | Ripple |

## Open Questions

1. Should there be a maximum number of monitored addresses per vault?
2. Should the system retry failed subscriptions automatically or require manual re-registration?
