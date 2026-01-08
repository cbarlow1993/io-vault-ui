# Build EVM Token Transaction

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can build an unsigned transaction for transferring ERC-20 tokens on EVM-compatible chains. The system encodes the token transfer function call, fetches token metadata, and constructs a properly formatted transaction ready for signing.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a POST request to `/v2/vaults/{vaultId}/transactions/ecosystem/evm/chain/{chain}/build-token-transaction` |
| **FR-2** | The request body must include `from` address (sender) |
| **FR-3** | The request body must include `to` address (recipient) |
| **FR-4** | The request body must include `tokenAddress` (ERC-20 contract address) |
| **FR-5** | The request body must include `amount` as a string (in token's smallest unit based on decimals) |
| **FR-6** | The request body may include optional gas parameters (`gasLimit`, `gasPrice`, `maxFeePerGas`, `maxPriorityFeePerGas`) |
| **FR-7** | The request body may include optional `nonce` to override automatic nonce fetching |
| **FR-8** | The system must fetch token metadata (symbol, decimals, name) and cache it |
| **FR-9** | The system must encode the ERC-20 `transfer(address,uint256)` function call in the transaction data |
| **FR-10** | The system must estimate gas for the token transfer |
| **FR-11** | The response must include the unsigned transaction object with encoded data field |
| **FR-12** | The response must include token metadata (symbol, decimals, name) |
| **FR-13** | The response must include estimated gas fee in native token and USD value |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to create transactions in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | From address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-5** | To address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-6** | Token address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-7** | Amount is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-8** | From address format is invalid | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-9** | Token address is not a valid ERC-20 contract | 400 Bad Request | `TOKEN_CONTRACT_INVALID` | |
| **VR-10** | From address is not registered in the vault | 400 Bad Request | `SENDER_NOT_IN_VAULT` | |
| **VR-11** | Chain is not supported | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-12** | Insufficient token balance | 400 Bad Request | `INSUFFICIENT_TOKEN_BALANCE` | |
| **VR-13** | Insufficient native balance for gas | 400 Bad Request | `INSUFFICIENT_GAS_BALANCE` | |
| **VR-14** | Token metadata fetch fails | 502 Bad Gateway | `TOKEN_METADATA_UNAVAILABLE` | |
| **VR-15** | Successful build | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Transaction building must complete within 5 seconds |
| **NFR-2** | Token metadata must be cached to reduce RPC calls |
| **NFR-3** | The system must handle non-standard ERC-20 implementations gracefully |

## Open Questions

1. Should the system support ERC-721 (NFT) transfers with a similar endpoint?
2. Should there be support for token approvals (ERC-20 approve)?
