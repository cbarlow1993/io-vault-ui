# Get Address Details

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can retrieve detailed information about a specific registered address, including its monitoring status, associated tokens, subscription information, and metadata.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a GET request to `/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chain}/address/{address}` |
| **FR-2** | The response must include: `address`, `chain`, `ecosystem`, `vaultId`, `organisationId`, `workspaceId` |
| **FR-3** | The response must include monitoring status: `monitoredAt`, `unmonitoredAt` (if applicable) |
| **FR-4** | The response must include optional metadata: `alias`, `derivationPath`, `subscriptionId` |
| **FR-5** | The response must include the list of tracked `tokens` with symbol, name, decimals, and contract address |
| **FR-6** | The response must include timestamps: `createdAt`, `updatedAt` |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to view addresses in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | Ecosystem is not supported | 400 Bad Request | `ECOSYSTEM_NOT_SUPPORTED` | |
| **VR-5** | Chain is not supported for the specified ecosystem | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-6** | Address is not registered in this vault | 404 Not Found | `ADDRESS_NOT_FOUND` | |
| **VR-7** | Successful retrieval | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Single address lookup must complete within 500ms |
| **NFR-2** | The system must use strongly consistent reads for address details |

## Open Questions

None at this time.
