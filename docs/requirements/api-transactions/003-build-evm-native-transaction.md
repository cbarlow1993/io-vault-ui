# Build EVM Native Transaction

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can build an unsigned transaction for transferring native cryptocurrency (ETH, MATIC, BNB, etc.) on EVM-compatible chains. The system automatically fetches current gas prices, estimates gas limits, and constructs a properly formatted transaction ready for signing.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a POST request to `/v2/vaults/{vaultId}/transactions/ecosystem/evm/chain/{chain}/build-native-transaction` |
| **FR-2** | The request body must include `from` address (sender) |
| **FR-3** | The request body must include `to` address (recipient) |
| **FR-4** | The request body must include `amount` as a string representing the value in the smallest unit (wei) |
| **FR-5** | The request body may include optional `gasLimit` to override automatic estimation |
| **FR-6** | The request body may include optional `gasPrice` for legacy transactions |
| **FR-7** | The request body may include optional `maxFeePerGas` and `maxPriorityFeePerGas` for EIP-1559 transactions |
| **FR-8** | The request body may include optional `nonce` to override automatic nonce fetching |
| **FR-9** | The request body may include optional `data` for contract interactions |
| **FR-10** | The system must fetch the current nonce for the sender address if not provided |
| **FR-11** | The system must estimate gas limit using eth_estimateGas if not provided |
| **FR-12** | The system must fetch current gas prices (EIP-1559 or legacy) if not provided |
| **FR-13** | The response must include the unsigned transaction object ready for signing |
| **FR-14** | The response must include estimated transaction fee in native token and USD value |
| **FR-15** | The system must default to EIP-1559 transaction format on chains that support it |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to create transactions in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | From address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-5** | To address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-6** | Amount is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-7** | From address format is invalid | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-8** | To address format is invalid | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-9** | Amount is not a valid positive number | 400 Bad Request | `AMOUNT_INVALID` | |
| **VR-10** | From address is not registered in the vault | 400 Bad Request | `SENDER_NOT_IN_VAULT` | |
| **VR-11** | Chain is not supported | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-12** | Insufficient balance for transfer and gas | 400 Bad Request | `INSUFFICIENT_BALANCE` | |
| **VR-13** | Gas estimation fails | 502 Bad Gateway | `GAS_ESTIMATION_FAILED` | |
| **VR-14** | RPC node unavailable | 502 Bad Gateway | `RPC_UNAVAILABLE` | |
| **VR-15** | Successful build | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Transaction building must complete within 5 seconds |
| **NFR-2** | The system must support all EVM chains configured in the chain registry |
| **NFR-3** | Gas price recommendations should include slow, average, and fast options |
| **NFR-4** | The system must use reliable RPC endpoints with failover support |

## Open Questions

1. Should the system pre-validate balance before building the transaction?
2. Should there be a way to specify priority (slow/average/fast) for automatic gas pricing?
