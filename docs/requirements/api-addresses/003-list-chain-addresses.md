# List Addresses by Chain

**Status:** Draft
**Last Updated:** 2026-01-07

## Overview

Users can retrieve a paginated list of blockchain addresses registered within a vault for a specific ecosystem and chain. This provides a filtered view useful for chain-specific operations and reporting.

## Dependencies

- [Cursor-Based Pagination](../common/001-cursor-pagination.md) - Standard pagination implementation

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a GET request to `/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chain}` |
| **FR-2** | The system must implement cursor-based pagination as defined in [001-cursor-pagination](../common/001-cursor-pagination.md) |
| **FR-3** | Results must be deterministically sorted by `monitoredAt` timestamp in descending order |
| **FR-4** | Each address item must include: `address`, `chain`, `ecosystem`, `vaultId`, `alias`, `monitoredAt`, `derivationPath` (if applicable), `tokens` |
| **FR-5** | The system must only return addresses matching the specified ecosystem and chain |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to view addresses in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | Ecosystem is not supported | 400 Bad Request | `ECOSYSTEM_NOT_SUPPORTED` | |
| **VR-5** | Chain is not supported for the specified ecosystem | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-6** | Pagination validation errors | See [001-cursor-pagination](../common/001-cursor-pagination.md#validation-requirements) | | |
| **VR-7** | Successful retrieval | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Chain-filtered queries must complete within 1 second |
| **NFR-2** | The system must use composite indexes for efficient chain-scoped queries |
