# Update Address

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can update metadata for a registered address, including the alias and hidden token settings. This allows customization of address display and filtering of unwanted tokens from balance views.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a PATCH request to `/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chain}/address/{address}` |
| **FR-2** | The request body may include an `alias` field to update the human-readable name (1-64 characters, or null to clear) |
| **FR-3** | The request body may include a `hiddenAssets` array of token contract addresses to hide from balance views |
| **FR-4** | The system must update the `updatedAt` timestamp on successful modification |
| **FR-5** | The response must return the complete updated address record |
| **FR-6** | Partial updates are supported - only provided fields are modified |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to update addresses in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | Address is not registered in this vault | 404 Not Found | `ADDRESS_NOT_FOUND` | |
| **VR-5** | Alias exceeds 64 characters | 400 Bad Request | `VALIDATION_ERROR` | `STRING_LENGTH_INVALID` |
| **VR-6** | Alias is empty string (use null to clear) | 400 Bad Request | `VALIDATION_ERROR` | `STRING_LENGTH_INVALID` |
| **VR-7** | Hidden asset address format is invalid | 400 Bad Request | `VALIDATION_ERROR` | `STRING_FORMAT_INVALID` |
| **VR-8** | Request body is empty | 400 Bad Request | `NO_FIELDS_TO_UPDATE` | |
| **VR-9** | Successful update | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Address updates must complete within 1 second |
| **NFR-2** | The system must use conditional writes to prevent race conditions |

## Open Questions

1. Should hidden assets be additive (merge with existing) or replace the entire list?
