# Cursor-Based Pagination

**Status:** Draft
**Last Updated:** 2026-01-07

## Overview

All list endpoints in the API use a standardized cursor-based pagination system. This provides consistent, efficient, and reliable pagination across all resources. Cursor-based pagination is preferred over offset-based pagination as it handles data changes between requests gracefully and performs better on large datasets.

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `cursor` | string | No | - | Opaque cursor from previous response for fetching next page |
| `limit` | integer | No | 20 | Maximum number of items to return per page |

## Response Format

All paginated responses must include a `pagination` object with the following structure:

```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6IjEyMyIsInRzIjoxNzA0MDY3MjAwfQ==",
    "hasMore": true,
    "total": 150
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nextCursor` | string \| null | Yes | Cursor for fetching the next page. Null if no more results. |
| `hasMore` | boolean | Yes | Whether more results are available beyond this page. |
| `total` | integer | No | Total count of items matching the query. Optional as it may be expensive to compute. |

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The default page limit must be 20 items when `limit` is not specified |
| **FR-2** | The maximum page limit must be 100 items for standard endpoints |
| **FR-3** | The maximum page limit must be 200 items for token balance endpoints |
| **FR-4** | Results must be sorted deterministically to ensure consistent pagination |
| **FR-5** | Cursors must be opaque strings (clients should not parse or construct them) |
| **FR-6** | Cursors should encode sufficient information to resume pagination efficiently |
| **FR-7** | The `nextCursor` must be null when there are no more results |
| **FR-8** | The `hasMore` field must accurately reflect whether additional pages exist |

## Validation Requirements

| ID | Condition | Response | Error Code |
|----|-----------|----------|------------|
| **VR-1** | `limit` is less than 1 | 400 Bad Request | `LIMIT_TOO_LOW` |
| **VR-2** | `limit` exceeds maximum for endpoint | 400 Bad Request | `LIMIT_TOO_HIGH` |
| **VR-3** | `cursor` is malformed or invalid | 400 Bad Request | `INVALID_CURSOR` |
| **VR-4** | `cursor` has expired | 400 Bad Request | `CURSOR_EXPIRED` |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Pagination cursors should remain valid for at least 1 hour |
| **NFR-2** | Cursor encoding should not expose internal database identifiers |
| **NFR-3** | Pagination must perform efficiently even on tables with millions of rows |

## Implementation Notes

### Cursor Encoding

Cursors should be base64-encoded JSON containing the minimum information needed to resume pagination:

```json
{
  "id": "last-item-id",
  "ts": 1704067200,
  "dir": "next"
}
```

### Sort Order

Default sort order should be by creation timestamp descending (newest first) unless otherwise specified by the endpoint.

### Total Count

The `total` field is optional because:
- COUNT queries can be expensive on large tables
- The count may change between requests
- Most UIs don't require exact counts

Endpoints may choose to:
- Always include `total`
- Include `total` only when requested via query parameter
- Never include `total`

## Usage Examples

### First Page Request
```
GET /v2/vaults/{vaultId}/addresses?limit=20
```

### Subsequent Page Request
```
GET /v2/vaults/{vaultId}/addresses?cursor=eyJpZCI6IjEyMyJ9&limit=20
```

### Response Example
```json
{
  "data": [
    { "address": "0x123...", "chainAlias": "ethereum", ... },
    { "address": "0x456...", "chainAlias": "polygon", ... }
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6IjQ1NiIsInRzIjoxNzA0MDY3MjAwfQ==",
    "hasMore": true,
    "total": 150
  }
}
```

## References

This pagination standard applies to all list endpoints:
- [List Vault Addresses](../api-addresses/002-list-vault-addresses.md)
- [List Chain Addresses](../api-addresses/003-list-chain-addresses.md)
- [List HD Addresses](../api-addresses/007-list-hd-addresses.md)
- [List Transactions](../api-transactions/001-list-transactions.md)
- [Get Token Balances](../api-balances/002-get-token-balances.md)
