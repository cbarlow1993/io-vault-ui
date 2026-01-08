# Build UTXO Native Transaction

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can build an unsigned transaction for transferring native cryptocurrency on UTXO-based chains (Bitcoin, Litecoin, Dogecoin, MNEE, etc.). The system fetches available UTXOs, selects inputs, calculates fees, and constructs a PSBT (Partially Signed Bitcoin Transaction) ready for signing.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a POST request to `/v2/vaults/{vaultId}/transactions/ecosystem/utxo/chain/{chain}/build-native-transaction` |
| **FR-2** | The request body must include `from` address (sender's address) |
| **FR-3** | The request body must include `to` address (recipient's address) |
| **FR-4** | The request body must include `amount` as a string in satoshis (or equivalent smallest unit) |
| **FR-5** | The request body may include optional `feeRate` in satoshis per byte |
| **FR-6** | The request body may include optional `changeAddress` for remaining UTXOs (defaults to sender) |
| **FR-7** | The system must fetch all available UTXOs for the sender address |
| **FR-8** | The system must implement UTXO selection algorithm (prioritize larger UTXOs, minimize dust) |
| **FR-9** | The system must calculate fee based on transaction size and network fee rate |
| **FR-10** | The system must create change output if the difference exceeds dust threshold |
| **FR-11** | The response must include the unsigned PSBT in base64 format |
| **FR-12** | The response must include transaction details: inputs, outputs, estimated fee |
| **FR-13** | The response must include estimated fee in the native coin and USD value |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to create transactions in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | From address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-5** | To address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-6** | Amount is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-7** | From address format is invalid for the chain | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-8** | To address format is invalid for the chain | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-9** | From address is not registered in the vault | 400 Bad Request | `SENDER_NOT_IN_VAULT` | |
| **VR-10** | Chain is not supported | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-11** | Amount is below dust threshold | 400 Bad Request | `AMOUNT_BELOW_DUST` | |
| **VR-12** | Insufficient UTXOs to cover amount and fee | 400 Bad Request | `INSUFFICIENT_BALANCE` | |
| **VR-13** | No UTXOs available for the address | 400 Bad Request | `NO_UTXOS_AVAILABLE` | |
| **VR-14** | UTXO fetch fails | 502 Bad Gateway | `UTXO_FETCH_FAILED` | |
| **VR-15** | Successful build | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Transaction building must complete within 5 seconds |
| **NFR-2** | The system must support different address formats per chain (P2PKH, P2SH, P2WPKH, etc.) |
| **NFR-3** | UTXO selection must minimize transaction fees while avoiding dust outputs |
| **NFR-4** | The system must handle chains with different dust thresholds |

## Open Questions

1. Should the system support send-all functionality (sweep entire balance)?
2. Should there be support for RBF (Replace-By-Fee) flag?
