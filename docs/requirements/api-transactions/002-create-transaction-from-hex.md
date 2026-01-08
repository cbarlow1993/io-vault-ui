# Create Transaction from Hex

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can submit a pre-built raw transaction in hexadecimal format for storage and tracking. This allows integration with external transaction building systems while still leveraging the platform's monitoring and enrichment capabilities.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a POST request to `/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chain}/transaction` |
| **FR-2** | The request body must include `rawTransaction` containing the hexadecimal-encoded transaction |
| **FR-3** | The system must decode and validate the raw transaction format for the specified chain |
| **FR-4** | The system must extract transaction metadata: sender address, recipient address, value, gas parameters |
| **FR-5** | The system must verify the sender address belongs to the specified vault |
| **FR-6** | The response must include the decoded transaction details and a unique `transactionId` |
| **FR-7** | The system must store the transaction for tracking purposes with status `PENDING_SIGNATURE` |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to create transactions in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | Raw transaction is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-5** | Raw transaction is not valid hexadecimal | 400 Bad Request | `TRANSACTION_HEX_INVALID` | |
| **VR-6** | Ecosystem is not supported | 400 Bad Request | `ECOSYSTEM_NOT_SUPPORTED` | |
| **VR-7** | Chain is not supported for the specified ecosystem | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-8** | Transaction format is invalid for the chain | 400 Bad Request | `TRANSACTION_FORMAT_INVALID` | |
| **VR-9** | Sender address is not registered in the vault | 400 Bad Request | `SENDER_NOT_IN_VAULT` | |
| **VR-10** | Successful creation | 201 Created | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Transaction parsing must complete within 1 second |
| **NFR-2** | Raw transaction data must be stored securely and immutably |

## Open Questions

1. Should the system support automatic broadcasting of the transaction to the network?
