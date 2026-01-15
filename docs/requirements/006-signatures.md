# Signatures

**Status:** Provisional
**Last Updated:** 2026-01-15

## Overview

Users can view the cryptographic signature history for a vault. Signatures are displayed in a paginated table showing status, description, data hash, algorithm used, creation time, and creator. This functionality is part of the vault detail page's Signatures tab.

## Functional Requirements

### Signatures Tab Header

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall display header text: "All cryptographic signatures produced by this vault" |
| **FR-2** | The system shall display the total signature count (e.g., "15 signatures") |

### Empty State

| ID | Requirement |
|----|-------------|
| **FR-3** | When no signatures exist, display empty state with: history icon, "No signatures yet" title, "This vault has not been used to sign any messages" description |
| **FR-4** | When vault is not active (draft status), display: "Signatures will be available once the vault is active" |

### Signatures Table

| ID | Requirement |
|----|-------------|
| **FR-5** | The system shall display signatures in a table with columns: Status, Description, Data, Algorithm, Created At, Created By |
| **FR-6** | Rows shall have hover state for interactivity |

#### Status Column

| ID | Requirement |
|----|-------------|
| **FR-7** | Status shall display icon and label with color coding |
| **FR-8** | Status mapping: completed → checkmark (positive), voting/presigning/signing → clock (warning), failed/rejected/expired → x-circle (negative) |
| **FR-9** | Status label shall be capitalized |

#### Description Column

| ID | Requirement |
|----|-------------|
| **FR-10** | Description shall be derived from content type and chain information |
| **FR-11** | Content type "application/x-eip712+json" → "EIP-712 Typed Data" |
| **FR-12** | Content type "text/plain" → "Plain Text Message" |
| **FR-13** | If chainId present → "Chain {chainId} Transaction" |
| **FR-14** | Default → "Raw Data Signature" |

#### Data Column

| ID | Requirement |
|----|-------------|
| **FR-15** | Data column shall display truncated hash (first 10 + "..." + last 8 characters) |
| **FR-16** | Prefer displaying signature if available, otherwise show data |
| **FR-17** | Data column shall include a copy button |
| **FR-18** | Copy button shall copy the full signature or data value |

#### Algorithm Column

| ID | Requirement |
|----|-------------|
| **FR-19** | Algorithm shall display in a monospace badge |
| **FR-20** | COSE algorithm mapping: eddsa/eddsa_blake2b → "EdDSA", es256k/eskec256 → "ECDSA" |

#### Timestamps and Creator

| ID | Requirement |
|----|-------------|
| **FR-21** | Created At shall display formatted date/time (MM/DD/YYYY, HH:MM format) |
| **FR-22** | Created By shall display the user identifier |

### Pagination

| ID | Requirement |
|----|-------------|
| **FR-23** | The system shall paginate signatures with configurable page sizes (5, 10, 25, 50) |
| **FR-24** | Pagination controls shall include: rows per page selector, current range display (e.g., "1-5 of 15"), first/previous/next/last page buttons, page number buttons with ellipsis |
| **FR-25** | Changing page size shall reset to page 1 |
| **FR-26** | Page buttons shall show visual distinction for current page (dark background, white text) |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Loading signatures | Display loading spinner with "Loading signatures..." | - | - |
| **VR-2** | Vault not active (API error VAULT_NOT_ACTIVE) | Display empty state: "Signatures will be available once the vault is active" | 400 | `VAULT_NOT_ACTIVE` |
| **VR-3** | API error | Display error state with message | 4xx/5xx | - |
| **VR-4** | No signatures | Display empty state | 200 OK | - |
| **VR-5** | Signatures found | Display paginated table | 200 OK | - |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Initial fetch shall retrieve up to 100 signatures for client-side pagination |
| **NFR-2** | Signature status values: voting, presigning, signing, completed, rejected, expired, failed |
| **NFR-3** | COSE algorithm values: eddsa, eddsa_blake2b, es256k, eskec256 |
| **NFR-4** | Content type values: application/octet-stream+hex, application/octet-stream+base64, text/plain, application/x-eip712+json |

## Test Plan

### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **UT-1** | Render empty signatures state | Empty state icon and message displayed |
| **UT-2** | Render draft vault signatures | "Vault not active" message displayed |
| **UT-3** | Render signature with "completed" status | Checkmark icon, positive color |
| **UT-4** | Render signature with "signing" status | Clock icon, warning color |
| **UT-5** | Render signature with "failed" status | X-circle icon, negative color |
| **UT-6** | Derive description from EIP-712 content type | "EIP-712 Typed Data" displayed |
| **UT-7** | Derive description from text/plain content type | "Plain Text Message" displayed |
| **UT-8** | Derive description from chainId | "Chain X Transaction" displayed |
| **UT-9** | Truncate data hash correctly | First 10 + "..." + last 8 chars |
| **UT-10** | Map eddsa algorithm | "EdDSA" badge displayed |
| **UT-11** | Map es256k algorithm | "ECDSA" badge displayed |
| **UT-12** | Format created date | Correct MM/DD/YYYY, HH:MM format |
| **UT-13** | Change page size | Pagination updates, resets to page 1 |
| **UT-14** | Navigate pages | Correct subset displayed |

### Browser Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **BT-1** | Click copy button on signature hash | Full value copied to clipboard |
| **BT-2** | Change rows per page | Table updates with new page size |
| **BT-3** | Click pagination first/last buttons | Navigates to first/last page |
| **BT-4** | Click pagination page numbers | Navigates to selected page |
| **BT-5** | Hover signature row | Row highlights |

### E2E Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **E2E-1** | Load signatures tab for active vault | Signatures fetched from API |
| **E2E-2** | Load signatures tab for draft vault | VAULT_NOT_ACTIVE handled gracefully |
| **E2E-3** | View vault with many signatures | Pagination works correctly |
| **E2E-4** | Copy signature data | Clipboard contains full value |
| **E2E-5** | Navigate through all signature pages | All signatures viewable |
