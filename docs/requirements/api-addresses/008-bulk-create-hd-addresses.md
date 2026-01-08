# Bulk Create HD Addresses

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can create multiple HD wallet addresses in a single operation by specifying an index range. The system derives addresses for each index in the range using the vault's standard derivation path template for the chain.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a POST request to `/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chain}/hd-addresses/bulk` |
| **FR-2** | The request body must include `indexFrom` (starting index, inclusive) |
| **FR-3** | The request body must include `indexTo` (ending index, inclusive) |
| **FR-4** | The index range must not exceed 100 addresses per request |
| **FR-5** | The system must derive addresses for each index using the chain's standard derivation path template (e.g., `m/44'/60'/0'/0/{index}` for EVM) |
| **FR-6** | For each derived address, the system must register it for monitoring if not already registered |
| **FR-7** | Addresses that already exist must be skipped without error |
| **FR-8** | The response must include a list of all created addresses with their derivation paths |
| **FR-9** | The response must indicate which addresses were newly created vs. already existed |
| **FR-10** | Address creation must be processed in parallel where possible for performance |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to create addresses in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | indexFrom is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-5** | indexTo is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-6** | indexFrom is negative | 400 Bad Request | `INDEX_INVALID` | |
| **VR-7** | indexTo is less than indexFrom | 400 Bad Request | `INDEX_RANGE_INVALID` | |
| **VR-8** | Index range exceeds 100 addresses | 400 Bad Request | `INDEX_RANGE_TOO_LARGE` | |
| **VR-9** | Ecosystem is not supported | 400 Bad Request | `ECOSYSTEM_NOT_SUPPORTED` | |
| **VR-10** | Chain is not supported for the specified ecosystem | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-11** | Vault does not have a root key for this chain/curve | 400 Bad Request | `ROOT_KEY_NOT_FOUND` | |
| **VR-12** | Successful bulk creation | 201 Created | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Bulk creation of 100 addresses must complete within 30 seconds |
| **NFR-2** | The system must use parallel processing with appropriate rate limiting for subscription setup |
| **NFR-3** | Partial failures must be reported with details on which addresses failed and why |
| **NFR-4** | The operation must be idempotent - repeated calls with the same range produce the same result |

## Open Questions

1. Should partial failures fail the entire operation or return partial success?
2. Should there be a way to specify a custom derivation path template instead of using the chain default?
