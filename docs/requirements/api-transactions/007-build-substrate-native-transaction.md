# Build Substrate Native Transaction

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can build an unsigned transaction for transferring native cryptocurrency on Substrate-based chains (Polkadot, Kusama, Bittensor, etc.). The system fetches chain metadata, calculates fees, and constructs a properly formatted extrinsic ready for signing.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a POST request to `/v2/vaults/{vaultId}/transactions/ecosystem/substrate/chain/{chain}/build-native-transaction` |
| **FR-2** | The request body must include `from` address (sender's SS58 address) |
| **FR-3** | The request body must include `to` address (recipient's SS58 address) |
| **FR-4** | The request body must include `amount` as a string in the smallest unit (planck for DOT, RAO for TAO) |
| **FR-5** | The request body may include optional `tip` to prioritize the transaction |
| **FR-6** | The request body may include optional `nonce` to override automatic nonce fetching |
| **FR-7** | The request body may include optional `era` for mortality period (default: mortal with 64 block lifetime) |
| **FR-8** | The system must fetch current chain metadata including runtime version |
| **FR-9** | The system must fetch current nonce for the sender if not provided |
| **FR-10** | The system must calculate estimated fee based on transaction weight |
| **FR-11** | The system must encode the balances.transferKeepAlive or balances.transfer call |
| **FR-12** | The response must include the unsigned extrinsic payload in hex format |
| **FR-13** | The response must include signing payload separately for hardware wallet compatibility |
| **FR-14** | The response must include estimated fee in the native token and USD value |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to create transactions in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | From address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-5** | To address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-6** | Amount is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-7** | From address is not a valid SS58 address | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-8** | To address is not a valid SS58 address | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-9** | From address is not registered in the vault | 400 Bad Request | `SENDER_NOT_IN_VAULT` | |
| **VR-10** | Chain is not supported | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-11** | Amount would kill the sender account (below existential deposit) | 400 Bad Request | `EXISTENTIAL_DEPOSIT_VIOLATION` | |
| **VR-12** | Recipient account would not meet existential deposit | 400 Bad Request | `RECIPIENT_EXISTENTIAL_DEPOSIT` | |
| **VR-13** | Insufficient balance | 400 Bad Request | `INSUFFICIENT_BALANCE` | |
| **VR-14** | Chain metadata unavailable | 502 Bad Gateway | `METADATA_UNAVAILABLE` | |
| **VR-15** | Successful build | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Transaction building must complete within 5 seconds |
| **NFR-2** | Chain metadata must be cached and refreshed on runtime upgrades |
| **NFR-3** | The system must handle existential deposit requirements per chain |
| **NFR-4** | Era mortality must be configurable for time-sensitive operations |

## Open Questions

1. Should the system support other Substrate pallets (staking, democracy, etc.)?
2. Should there be an option for immortal transactions?
