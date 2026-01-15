# Reshare Detail

**Status:** Provisional
**Last Updated:** 2026-01-15

## Overview

Users can view the details of a reshare request including its status, approval progress, and a before/after comparison of the vault configuration changes. The page shows which signers have approved and the changes being made to the vault's signer set and threshold.

## Functional Requirements

### Header and Navigation

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall display breadcrumbs: Vaults > {Vault Name} > Reshare Request |
| **FR-2** | For pending reshares (voting or signing status), display a "Cancel Request" button |

### Request Information Section

| ID | Requirement |
|----|-------------|
| **FR-3** | The system shall display a "Request Information" card with: Status, Requested By, Requested At, Expires At (if available) |
| **FR-4** | Status shall display with appropriate color-coded badge: Completed (positive), Pending Approval/Signing in Progress (warning), Failed/Rejected/Expired (negative) |
| **FR-5** | Status labels shall map: voting → "Pending Approval", signing → "Signing in Progress", completed → "Completed", failed → "Failed", rejected → "Rejected", expired → "Expired" |

### Approvals Section

| ID | Requirement |
|----|-------------|
| **FR-6** | The system shall display an "Approvals" card with progress indicator |
| **FR-7** | The header shall show: "X of Y required (Z total signers)" |
| **FR-8** | The system shall display a progress bar showing approval percentage |
| **FR-9** | Progress bar shall be brand color when incomplete, emerald/green when threshold met |
| **FR-10** | The system shall list each signer's approval status |
| **FR-11** | Each approval item shall display: icon (checkmark if approved, clock if pending), signer name, status text ("Approved" with timestamp or "Pending") |

### Reshare Details Section

| ID | Requirement |
|----|-------------|
| **FR-12** | The system shall display a "Reshare Details" card |

#### Reason Subsection

| ID | Requirement |
|----|-------------|
| **FR-13** | The system shall display "Reason for Change" with the memo text |
| **FR-14** | If no memo provided, display "No reason provided" |

#### Summary of Changes Subsection

| ID | Requirement |
|----|-------------|
| **FR-15** | The system shall display change summary badges |
| **FR-16** | If threshold changed, display: "Threshold: X → Y" (blue badge) |
| **FR-17** | If signers added, display: "+N signer(s)" (green badge) |
| **FR-18** | If signers removed, display: "-N signer(s)" (red badge) |

#### Before/After Comparison Subsection

| ID | Requirement |
|----|-------------|
| **FR-19** | The system shall display a two-column comparison: Before and After |
| **FR-20** | Each column shall show the threshold (e.g., "Threshold: 3 of 4") |
| **FR-21** | Each column shall list the signers with: device icon, name, owner, device type, voting power |

#### Signer Change Indicators

| ID | Requirement |
|----|-------------|
| **FR-22** | Signers being removed shall be highlighted with red border/background and "Removed" badge in the Before column |
| **FR-23** | Signers being added shall be highlighted with green border/background and "Added" badge in the After column |
| **FR-24** | Unchanged signers shall have neutral styling |
| **FR-25** | If Before state has no signers (initial setup), display "No signers (initial setup)" placeholder |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Reshare not found | Display "Reshare Not Found" message | 404 | - |
| **VR-2** | Loading state | Display "Loading reshare details..." | - | - |
| **VR-3** | API returns votes | Merge with approval display showing actual vote status | 200 OK | - |
| **VR-4** | Successful fetch | Display reshare detail page | 200 OK | - |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Reshare status values from API: voting, signing, completed, failed, expired, rejected |
| **NFR-2** | Vote results from API: approve, reject |
| **NFR-3** | The page shall fetch both reshare details and votes data in parallel |
| **NFR-4** | Device icons: Server for virtual, Smartphone for iOS/Android |

## Test Plan

### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **UT-1** | Render reshare with "voting" status | "Pending Approval" badge, Cancel button visible |
| **UT-2** | Render reshare with "signing" status | "Signing in Progress" badge, Cancel button visible |
| **UT-3** | Render reshare with "completed" status | "Completed" badge, no Cancel button |
| **UT-4** | Render reshare with "failed" status | "Failed" badge, no Cancel button |
| **UT-5** | Render approvals progress at 33% | Progress bar shows 1/3, brand color |
| **UT-6** | Render approvals progress at 100% | Progress bar full, green color |
| **UT-7** | Render approval list with mixed status | Approved signers with checkmark, pending with clock |
| **UT-8** | Render threshold change badge | Shows "Threshold: X → Y" in blue |
| **UT-9** | Render added signers badge | Shows "+N signer(s)" in green |
| **UT-10** | Render removed signers badge | Shows "-N signer(s)" in red |
| **UT-11** | Render before/after comparison | Two columns with signer lists |
| **UT-12** | Highlight added signer in After column | Green styling with "Added" badge |
| **UT-13** | Highlight removed signer in Before column | Red styling with "Removed" badge |
| **UT-14** | Render initial setup (no before signers) | "No signers" placeholder in Before column |

### Browser Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **BT-1** | Click breadcrumb to vault | Navigates to vault detail |
| **BT-2** | Click breadcrumb to vaults list | Navigates to vaults list |
| **BT-3** | Click Cancel Request button | Action triggered (dialog or direct cancel) |
| **BT-4** | View approval timestamps | Formatted dates displayed |

### E2E Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **E2E-1** | Load reshare detail page | Data fetched from API, page populated |
| **E2E-2** | Navigate from vault to reshare | Correct reshare loaded |
| **E2E-3** | View reshare with approvals | Votes merged with signer display |
| **E2E-4** | Cancel pending reshare | API called, navigation to vault |
| **E2E-5** | Load completed reshare | Historical data displayed correctly |
| **E2E-6** | Load non-existent reshare | Not found state displayed |
