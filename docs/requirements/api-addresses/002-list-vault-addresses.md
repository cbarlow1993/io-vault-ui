# List Vault Addresses

**Status:** Draft
**Last Updated:** 2026-01-07

## Overview

Users can retrieve a paginated list of all blockchain addresses registered within a vault. The list includes addresses across all chains and ecosystems, with filtering options for monitoring status. Results are sorted by creation date for deterministic pagination.

## Dependencies

- [Cursor-Based Pagination](../common/001-cursor-pagination.md) - Standard pagination implementation

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a GET request to `/v2/vaults/{vaultId}/addresses` |
| **FR-2** | The system must implement cursor-based pagination as defined in [001-cursor-pagination](../common/001-cursor-pagination.md) |
| **FR-3** | The system must support filtering by monitoring status via `status` query parameter (`monitored`, `unmonitored`, `all`) |
| **FR-4** | Results must be deterministically sorted by `monitoredAt` timestamp in descending order (newest first) |
| **FR-5** | Each address item must include: `address`, `chain`, `ecosystem`, `vaultId`, `alias`, `monitoredAt`, `derivationPath` (if applicable), `tokens` |
| **FR-6** | The system must only return addresses belonging to the authenticated user's organisation |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to view addresses in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | Status filter value is invalid | 400 Bad Request | `VALIDATION_ERROR` | `ENUM_VALUE_INVALID` |
| **VR-5** | Pagination validation errors | See [001-cursor-pagination](../common/001-cursor-pagination.md#validation-requirements) | | |
| **VR-6** | Successful retrieval | 200 OK | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | List queries must complete within 2 seconds for vaults with up to 10,000 addresses |
| **NFR-2** | The system must use PostgreSQL indexes for efficient vault-scoped queries |
