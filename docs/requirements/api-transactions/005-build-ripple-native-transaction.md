# Build Ripple Native Transaction

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can build an unsigned transaction for transferring XRP on the Ripple (XRP Ledger) network. The system fetches current account sequence, calculates fees, and constructs a properly formatted payment transaction ready for signing.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a POST request to `/v2/vaults/{vaultId}/transactions/ecosystem/xrp/chain/ripple/build-native-transaction` |
| **FR-2** | The request body must include `from` address (sender's r-address) |
| **FR-3** | The request body must include `to` address (recipient's r-address) |
| **FR-4** | The request body must include `amount` as a string in drops (1 XRP = 1,000,000 drops) |
| **FR-5** | The request body may include optional `destinationTag` (integer) for exchange deposits |
| **FR-6** | The request body may include optional `memo` object with `type`, `data`, and `format` fields |
| **FR-7** | The request body may include optional `fee` to override automatic fee calculation |
| **FR-8** | The request body may include optional `sequence` to override automatic sequence fetching |
| **FR-9** | The system must fetch the current account sequence from the XRP Ledger if not provided |
| **FR-10** | The system must calculate the appropriate fee based on current network conditions if not provided |
| **FR-11** | The system must set an appropriate `LastLedgerSequence` for transaction expiry |
| **FR-12** | The response must include the unsigned transaction in XRP Ledger JSON format |
| **FR-13** | The response must include estimated fee in XRP and USD value |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to create transactions in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | From address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-5** | To address is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-6** | Amount is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-7** | From address is not a valid XRP address (r-address) | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-8** | To address is not a valid XRP address | 400 Bad Request | `ADDRESS_FORMAT_INVALID` | |
| **VR-9** | From address is not registered in the vault | 400 Bad Request | `SENDER_NOT_IN_VAULT` | |
| **VR-10** | Destination tag is not a valid integer (0-4294967295) | 400 Bad Request | `DESTINATION_TAG_INVALID` | |
| **VR-11** | Amount is below minimum (10 drops) | 400 Bad Request | `AMOUNT_TOO_LOW` | |
| **VR-12** | To address requires activation (< 10 XRP reserve) | 400 Bad Request | `ACCOUNT_NOT_ACTIVATED` | |
| **VR-13** | Insufficient XRP balance | 400 Bad Request | `INSUFFICIENT_BALANCE` | |
| **VR-14** | XRP Ledger node unavailable | 502 Bad Gateway | `RPC_UNAVAILABLE` | |
| **VR-15** | Successful build | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Transaction building must complete within 3 seconds |
| **NFR-2** | The system must handle account reserve requirements (10 XRP minimum) |
| **NFR-3** | LastLedgerSequence must allow sufficient time for signing (current + 20 ledgers) |

## Open Questions

1. Should the system support issued currencies (IOU) transfers?
2. Should trust line setup be handled as a separate endpoint?
