# Signers

**Status:** Provisional
**Last Updated:** 2025-01-15

## Overview

Users can view and manage signers that participate in vault signing operations. Signers can be mobile devices (iOS/Android) or virtual (cloud-hosted HSM). The system provides a list view with filtering, a detail view showing associated vaults and signature activity, and modals for adding new signers, viewing configuration, renaming, and revoking signers.

## Functional Requirements

### Signers List Page

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall display a signers list page at `/treasury/signers` |
| **FR-2** | The system shall display summary cards showing: total signers count, iOS count, Android count, and Virtual count |
| **FR-3** | The system shall provide a search input that filters signers by name or owner (case-insensitive partial match) |
| **FR-4** | The system shall provide a status filter dropdown with options: All Status, Active, Pending, Revoked |
| **FR-5** | The system shall provide a type filter dropdown with options: All Types, iOS, Android, Virtual |
| **FR-6** | The system shall display a "Clear" button when any filter is active, which resets all filters to defaults |
| **FR-7** | The system shall display a results count indicating the number of filtered signers |
| **FR-8** | The system shall display signers in a data table with columns: Name, Type, Version, Status, Vaults, Last Seen, Actions |
| **FR-9** | The Name column shall display the signer name, owner, and device info |
| **FR-10** | The Type column shall display an icon (smartphone for iOS/Android, server for Virtual) and type label |
| **FR-11** | The Version column shall display the version number with an "Update" warning badge if the version is outdated |
| **FR-12** | The Status column shall display a styled badge with the status (active, pending, or revoked) |
| **FR-13** | The Last Seen column shall display a health indicator (colored dot) and relative time |
| **FR-14** | The Actions column shall provide a dropdown menu with: View Details, View Config, Rename, Revoke Signer |
| **FR-15** | The Revoke Signer action shall be disabled if the signer status is already "revoked" |
| **FR-16** | Clicking a table row shall navigate to the signer detail page |
| **FR-17** | The system shall display a "New Signer" button that opens the new signer modal |
| **FR-18** | Navigating to `/treasury/signers/new` shall open the signers page with the new signer modal already open |
| **FR-19** | The data table shall support client-side pagination with page size options: 5, 10, 25, 50 |

### Signer Health Status

| ID | Requirement |
|----|-------------|
| **FR-20** | The system shall calculate health status as "online" (green) if lastSeen is within 15 minutes |
| **FR-21** | The system shall calculate health status as "idle" (yellow) if lastSeen is within 24 hours but more than 15 minutes |
| **FR-22** | The system shall calculate health status as "offline" (red) if lastSeen is more than 24 hours or signer is revoked |
| **FR-23** | The system shall calculate health status as "unknown" (gray) if lastSeen is null or signer is pending |

### Signer Version Status

| ID | Requirement |
|----|-------------|
| **FR-24** | The system shall compare signer versions against known latest versions: iOS 3.1.0, Android 3.1.0, Virtual 2.4.1 |
| **FR-25** | The system shall display an "Update" warning badge next to outdated versions |

### Signer Detail Page

| ID | Requirement |
|----|-------------|
| **FR-26** | The system shall display a signer detail page at `/treasury/signers/:signerId` |
| **FR-27** | The system shall display breadcrumbs showing: Signers > {signer name} |
| **FR-28** | The system shall display a signer info section with: Type (with icon and label), Owner, Registered date, Last Seen |
| **FR-29** | The system shall display type labels as: "iOS", "Android", or "Virtual (HSM)" |
| **FR-30** | The system shall display a device/version section with: Device Info, Version, Vaults Count |
| **FR-31** | The system shall display an "Associated Vaults" section showing vaults where this signer is a key holder |
| **FR-32** | The Associated Vaults table shall display columns: Vault Name, Threshold, Total Signers, Status, Voting Power |
| **FR-33** | Vault names in the Associated Vaults table shall link to the vault detail page |
| **FR-34** | The system shall display an empty state for Associated Vaults when the signer has no associated vaults |
| **FR-35** | The system shall display a "Signature Activity" section showing recent signatures this signer has participated in |
| **FR-36** | The Signature Activity table shall display columns: Status (with icon), Description, Vault, Hash, Curve, Signed At |
| **FR-37** | The Hash column shall display a truncated hash with a copy button |
| **FR-38** | Vault names in the Signature Activity table shall link to the vault detail page |
| **FR-39** | The system shall display an empty state for Signature Activity when the signer has no signature history |
| **FR-40** | The system shall display a loading state while fetching signer data |
| **FR-41** | The system shall display a "Not Found" error page if the signer ID does not exist |

### New Signer Modal

| ID | Requirement |
|----|-------------|
| **FR-42** | The new signer modal shall display a signer type selection with options: iOS, Android, Virtual |
| **FR-43** | Each signer type option shall display an icon, title, and description |
| **FR-44** | Selecting a type shall navigate to type-specific setup instructions |
| **FR-45** | The user shall be able to navigate back to type selection from instructions |
| **FR-46** | iOS instructions shall display: a QR code linking to the App Store, a direct link, and numbered setup steps |
| **FR-47** | Android instructions shall display: a QR code linking to Google Play, a direct link, and numbered setup steps |
| **FR-48** | Virtual instructions shall display: feature list, documentation link, numbered setup steps, and Docker quick start command |
| **FR-49** | The modal shall have a "Done" button when viewing instructions |

### Signer Config Modal

| ID | Requirement |
|----|-------------|
| **FR-50** | The signer config modal shall display the signer name and description |
| **FR-51** | The modal shall display the Public Key with a copy button |
| **FR-52** | The modal shall display Supported Curves as styled badges |
| **FR-53** | The modal shall display Allowed Networks as styled badges |
| **FR-54** | The modal shall display "No networks configured" if allowedNetworks is empty |
| **FR-55** | The modal shall display API Endpoint (with copy button) if the signer has one (virtual signers) |
| **FR-56** | The modal shall display Settings: Auto Approve, Notifications, Backup (as enabled/disabled badges) |
| **FR-57** | The modal shall display Max Daily Signatures if configured |
| **FR-58** | The modal shall display the Last Sync timestamp |

### Rename Signer Modal

| ID | Requirement |
|----|-------------|
| **FR-59** | The rename modal shall display an input field pre-filled with the current signer name |
| **FR-60** | The rename modal shall display the current name below the input for reference |
| **FR-61** | The Rename button shall be disabled if the name is empty or unchanged |
| **FR-62** | Submitting the form shall call the rename handler with signer ID and new name |

### Revoke Signer Modal

| ID | Requirement |
|----|-------------|
| **FR-63** | The revoke modal shall display a warning-styled header indicating the action is irreversible |
| **FR-64** | The modal shall display the signer name in the confirmation message |
| **FR-65** | The modal shall display a warning with affected vaults if the signer is associated with any vaults |
| **FR-66** | The affected vaults warning shall list vault names with their threshold configuration |
| **FR-67** | The modal shall display signer details: Owner, Type, Registered date |
| **FR-68** | The modal shall have Cancel and Revoke Signer buttons |
| **FR-69** | Confirming shall call the revoke handler with the signer ID |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | Signer ID does not exist | UI shows "Not Found" page | - | |
| **VR-3** | Rename with empty name | Submit button disabled | - | |
| **VR-4** | Rename with unchanged name | Submit button disabled | - | |
| **VR-5** | Revoke already revoked signer | Action disabled in menu | - | |
| **VR-6** | API request fails | 500+ server error | `REQUEST_FAILED` | |
| **VR-7** | Successful signers list fetch | 200 OK | - | |

## Data Model

### Signer

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Display name |
| `owner` | string | Owner/user who registered the signer |
| `type` | enum | ios, android, virtual |
| `version` | string | Signer software version (semver) |
| `status` | enum | active, pending, revoked |
| `registeredAt` | string | Registration date |
| `lastSeen` | string | null | Relative time of last activity |
| `deviceInfo` | string | Optional device description |
| `vaultsCount` | number | Number of associated vaults |
| `config` | SignerConfig | Signer configuration |

### SignerConfig

| Field | Type | Description |
|-------|------|-------------|
| `publicKey` | string | Signer's public key |
| `supportedCurves` | string[] | Cryptographic curves (e.g., ECDSA, EdDSA) |
| `apiEndpoint` | string | Optional API endpoint (virtual signers) |
| `autoApprove` | boolean | Auto-approve transactions |
| `notificationsEnabled` | boolean | Push notifications enabled |
| `maxDailySignatures` | number | Optional daily signature limit |
| `allowedNetworks` | string[] | Permitted blockchain networks |
| `backupEnabled` | boolean | Backup configuration enabled |
| `lastSyncAt` | string | Last sync timestamp |

### SignerVaultSummary (Detail Page)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Vault ID |
| `name` | string | Vault name |
| `threshold` | number | Required signatures |
| `totalSigners` | number | Total signers in vault |
| `status` | enum | active, pending, revoked |
| `votingPower` | number | Signer's voting weight |

### SignerSignatureActivity (Detail Page)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Signature ID |
| `hash` | string | Transaction hash |
| `vaultId` | string | Associated vault ID |
| `vaultName` | string | Associated vault name |
| `signedAt` | string | Signature timestamp |
| `description` | string | Transaction description |
| `curveUsed` | string | Cryptographic curve used |
| `status` | enum | completed, pending, failed |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | The signers list shall support pagination with configurable page sizes |
| **NFR-2** | Filter changes shall trigger API requests (server-side filtering where available) |
| **NFR-3** | Copy buttons shall provide visual feedback (checkmark) for 2 seconds after copying |
| **NFR-4** | QR codes in new signer modal shall be scannable by mobile device cameras |
| **NFR-5** | The system shall display loading states during data fetches |
| **NFR-6** | The system shall display error states with retry capability on fetch failures |

## API Integration Notes

The current implementation transforms API responses with placeholder values until the API returns complete signer data:

| Field | Current Behavior |
|-------|-----------------|
| `type` | Defaults to "virtual" |
| `version` | Defaults to "1.0.0" |
| `status` | Defaults to "active" |
| `lastSeen` | Always null |
| `vaultsCount` | Always 0 |
| `config` | Constructed from available API fields |

Client-side filtering is applied for status, type, and search until the API supports these query parameters.

## Test Plan

### Unit Tests

| Test ID | Description | Test File |
|---------|-------------|-----------|
| **UT-1** | `isVersionOutdated` returns true for versions below latest | `signers.unit.spec.ts` |
| **UT-2** | `isVersionOutdated` returns false for current versions | `signers.unit.spec.ts` |
| **UT-3** | `getSignerHealthStatus` returns "online" for recent activity (<15 min) | `signers.unit.spec.ts` |
| **UT-4** | `getSignerHealthStatus` returns "idle" for activity within 24 hours | `signers.unit.spec.ts` |
| **UT-5** | `getSignerHealthStatus` returns "offline" for activity >24 hours | `signers.unit.spec.ts` |
| **UT-6** | `getSignerHealthStatus` returns "unknown" for pending signers | `signers.unit.spec.ts` |
| **UT-7** | `getSignerHealthStatus` returns "offline" for revoked signers | `signers.unit.spec.ts` |
| **UT-8** | `filterSigners` filters by status correctly | `signers.unit.spec.ts` |
| **UT-9** | `filterSigners` filters by type correctly | `signers.unit.spec.ts` |
| **UT-10** | `filterSigners` filters by search term (name) case-insensitively | `signers.unit.spec.ts` |
| **UT-11** | `filterSigners` filters by search term (owner) case-insensitively | `signers.unit.spec.ts` |
| **UT-12** | Zod schema validates valid signer objects | `schema.unit.spec.ts` |
| **UT-13** | Zod schema rejects invalid signer type values | `schema.unit.spec.ts` |
| **UT-14** | Zod schema rejects invalid signer status values | `schema.unit.spec.ts` |

### Browser Tests

| Test ID | Description | Test File |
|---------|-------------|-----------|
| **BT-1** | Signers list page renders with loading state | `page-signers.browser.spec.ts` |
| **BT-2** | Signers list page displays summary cards with correct counts | `page-signers.browser.spec.ts` |
| **BT-3** | Search input filters signers by name | `page-signers.browser.spec.ts` |
| **BT-4** | Status filter dropdown filters signers correctly | `page-signers.browser.spec.ts` |
| **BT-5** | Type filter dropdown filters signers correctly | `page-signers.browser.spec.ts` |
| **BT-6** | Clear button resets all filters to defaults | `page-signers.browser.spec.ts` |
| **BT-7** | Table displays correct columns and data | `page-signers.browser.spec.ts` |
| **BT-8** | Outdated version badge displays for old versions | `page-signers.browser.spec.ts` |
| **BT-9** | Health indicator displays correct color based on status | `page-signers.browser.spec.ts` |
| **BT-10** | Row click triggers navigation to detail page | `page-signers.browser.spec.ts` |
| **BT-11** | Actions dropdown opens with correct menu items | `page-signers.browser.spec.ts` |
| **BT-12** | Revoke action is disabled for already revoked signers | `page-signers.browser.spec.ts` |
| **BT-13** | New Signer button opens modal | `page-signers.browser.spec.ts` |
| **BT-14** | Signer detail page renders signer info correctly | `page-signer-detail.browser.spec.ts` |
| **BT-15** | Signer detail page displays associated vaults table | `page-signer-detail.browser.spec.ts` |
| **BT-16** | Signer detail page displays empty state for no vaults | `page-signer-detail.browser.spec.ts` |
| **BT-17** | Signer detail page displays signature activity table | `page-signer-detail.browser.spec.ts` |
| **BT-18** | Signer detail page displays empty state for no activity | `page-signer-detail.browser.spec.ts` |
| **BT-19** | Signer detail page shows not found for invalid ID | `page-signer-detail.browser.spec.ts` |
| **BT-20** | New signer modal displays type selection | `new-signer-modal.browser.spec.ts` |
| **BT-21** | iOS type shows QR code and setup instructions | `new-signer-modal.browser.spec.ts` |
| **BT-22** | Android type shows QR code and setup instructions | `new-signer-modal.browser.spec.ts` |
| **BT-23** | Virtual type shows feature list and docker command | `new-signer-modal.browser.spec.ts` |
| **BT-24** | Back button returns to type selection | `new-signer-modal.browser.spec.ts` |
| **BT-25** | Signer config modal displays all configuration sections | `signer-config-modal.browser.spec.ts` |
| **BT-26** | Copy buttons copy values to clipboard | `signer-config-modal.browser.spec.ts` |
| **BT-27** | API endpoint section only shows for virtual signers | `signer-config-modal.browser.spec.ts` |
| **BT-28** | Rename modal pre-fills with current signer name | `rename-signer-modal.browser.spec.ts` |
| **BT-29** | Rename submit disabled for empty or unchanged name | `rename-signer-modal.browser.spec.ts` |
| **BT-30** | Rename submit calls handler with correct arguments | `rename-signer-modal.browser.spec.ts` |
| **BT-31** | Revoke modal displays warning and signer details | `revoke-signer-modal.browser.spec.ts` |
| **BT-32** | Revoke modal shows affected vaults warning | `revoke-signer-modal.browser.spec.ts` |
| **BT-33** | Revoke confirm calls handler with signer ID | `revoke-signer-modal.browser.spec.ts` |

### E2E Tests

| Test ID | Description | Test File |
|---------|-------------|-----------|
| **E2E-1** | User can navigate to signers list from navigation | `signers.spec.ts` |
| **E2E-2** | User can search for a signer by name | `signers.spec.ts` |
| **E2E-3** | User can filter signers by status | `signers.spec.ts` |
| **E2E-4** | User can filter signers by type | `signers.spec.ts` |
| **E2E-5** | User can clear active filters | `signers.spec.ts` |
| **E2E-6** | User can navigate to signer detail from list | `signers.spec.ts` |
| **E2E-7** | User can navigate to signer detail via View Details action | `signers.spec.ts` |
| **E2E-8** | User can open and close signer config modal | `signers.spec.ts` |
| **E2E-9** | User can open and close rename signer modal | `signers.spec.ts` |
| **E2E-10** | User can open and close revoke signer modal | `signers.spec.ts` |
| **E2E-11** | User can open new signer modal via button | `signers.spec.ts` |
| **E2E-12** | User can open new signer modal via /treasury/signers/new URL | `signers.spec.ts` |
| **E2E-13** | User can select signer type and view instructions | `signers.spec.ts` |
| **E2E-14** | User can navigate back from instructions to type selection | `signers.spec.ts` |
| **E2E-15** | Signer detail breadcrumb navigates back to signers list | `signers.spec.ts` |
| **E2E-16** | Vault links on signer detail navigate to vault detail | `signers.spec.ts` |
| **E2E-17** | Pagination works correctly on signers list | `signers.spec.ts` |

### Test Data Requirements

| Data Set | Description |
|----------|-------------|
| Active iOS signer | Signer with type=ios, status=active, lastSeen within 15 min |
| Active Android signer | Signer with type=android, status=active, outdated version |
| Active Virtual signer | Signer with type=virtual, status=active, apiEndpoint configured |
| Pending signer | Signer with status=pending, lastSeen=null |
| Revoked signer | Signer with status=revoked, lastSeen > 24h ago |
| Signer with vaults | Signer associated with 2+ vaults |
| Signer without vaults | Signer with vaultsCount=0, no associated vaults |
| Signer with signature activity | Signer with completed, pending, and failed signatures |
| Signer without activity | Signer with no signature history |

### Test Coverage Targets

| Area | Coverage Target |
|------|-----------------|
| Unit tests (utilities) | 100% line coverage |
| Unit tests (schemas) | 100% branch coverage |
| Browser tests (components) | All interactive elements |
| E2E tests | All critical user flows |

## Open Questions

1. Should the rename and revoke operations call real API endpoints or remain client-side only?
2. What is the expected behavior when a signer is revoked but still associated with vaults?
3. Should the Associated Vaults and Signature Activity sections fetch data from dedicated API endpoints?
4. What permissions are required for rename and revoke operations?
