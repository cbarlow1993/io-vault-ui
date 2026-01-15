# Vault Detail

**Status:** Provisional
**Last Updated:** 2026-01-15

## Overview

Users can view comprehensive details of a vault including its configuration, cryptographic curves, signers, derived addresses, and signature history. The vault detail page uses a tabbed interface to organize information. A pending reshare banner displays when a reshare request is awaiting approval.

## Functional Requirements

### Header and Navigation

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall display breadcrumbs: Vaults > {Vault Name} |
| **FR-2** | The system shall display the vault status badge next to the title |
| **FR-3** | The system shall display a "Reshare" button when vault status is active and no pending reshare exists |
| **FR-4** | The system shall display a "Sign Message" button for active vaults |
| **FR-5** | The "Reshare" button shall navigate to the vault edit/reshare form |

### Pending Reshare Banner

| ID | Requirement |
|----|-------------|
| **FR-6** | When a pending reshare exists, the system shall display a warning banner showing: pending reshare message, requestor name, request date, approval count (e.g., "1 of 3 signers") |
| **FR-7** | The pending reshare banner shall display the new threshold and new signer count |
| **FR-8** | The pending reshare banner shall display approval status badges for each signer showing approved/pending state |
| **FR-9** | The pending reshare banner shall include a "Cancel Request" button |
| **FR-10** | The "Cancel Request" button shall open a confirmation dialog before cancelling |

### Vault Info Section

| ID | Requirement |
|----|-------------|
| **FR-11** | The system shall display vault metadata in a grid: Created date with creator name, Last Used date (or "Never"), Total Signatures count |

### Linked Identity Section

| ID | Requirement |
|----|-------------|
| **FR-12** | When a vault has a linked identity, the system shall display the identity card with: icon (building for corporate, user for individual), display name or name, identity type, KYC status badge |
| **FR-13** | Clicking the linked identity shall navigate to the identity detail page |

### Tabs Section

| ID | Requirement |
|----|-------------|
| **FR-14** | The system shall display three tabs: Addresses (with count badge), Details, Signatures (with count badge) |
| **FR-15** | The active tab shall be indicated with brand color styling |
| **FR-16** | Tab selection shall be persisted in URL query parameter for deep linking |

### Addresses Tab

| ID | Requirement |
|----|-------------|
| **FR-17** | The addresses tab shall display a header with description text and action buttons |
| **FR-18** | The system shall provide a "New Address" button linking to the new address form |
| **FR-19** | The system shall provide a "View All" link when addresses exist |
| **FR-20** | Empty state shall display icon, "No addresses yet" message, and instructional text |
| **FR-21** | Each address row shall display: chain icon with color, truncated address (first 6 + last 4 characters), alias if present, chain name, address type, total balance |
| **FR-22** | The addresses tab shall show a maximum of 5 addresses with "View all X addresses" link |
| **FR-23** | Clicking an address row shall navigate to the address detail page |

### Details Tab

| ID | Requirement |
|----|-------------|
| **FR-24** | The details tab shall display two sections: Cryptographic Curves and Signers |

#### Cryptographic Curves Section

| ID | Requirement |
|----|-------------|
| **FR-25** | For draft vaults, display "Pending Key Generation" state with message explaining curves are available after initial reshare |
| **FR-26** | For draft vaults with pending reshare, display a "Go to Reshare" button |
| **FR-27** | For active vaults, display curves in a 2-column grid with: curve type badge (ECDSA/EdDSA), curve name, curve index, fingerprint with copy button, public key (truncated) with copy button |

#### Signers Section

| ID | Requirement |
|----|-------------|
| **FR-28** | The signers section shall display the threshold value |
| **FR-29** | The signers section header shall show description: "Distributed key holders for threshold signing" |
| **FR-30** | The system shall display signers in a table with columns: Device (with icon), Name, Owner, Voting Power |
| **FR-31** | Device type shall display appropriate icon (Server for virtual, Smartphone for iOS/Android) and label |
| **FR-32** | Voting power shall display as a numeric badge |

### Signatures Tab

| ID | Requirement |
|----|-------------|
| **FR-33** | The signatures tab shall display a header with description and total count |
| **FR-34** | Empty state shall display icon, "No signatures yet" message, and instructional text |
| **FR-35** | The system shall display signatures in a table with columns: Status, Description, Hash, Curve, Signed At, Signed By |
| **FR-36** | Status column shall display icon and label: checkmark/completed (positive), clock/pending (warning), x-circle/failed (negative) |
| **FR-37** | Hash column shall display truncated value with copy button |
| **FR-38** | Curve column shall display a monospace badge |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Vault not found | Display "Not Found" page with link to return to vaults list | 404 | - |
| **VR-2** | Loading state | Display loader with breadcrumb placeholder | - | - |
| **VR-3** | Vault found | Display vault detail page | 200 OK | - |
| **VR-4** | Cancel reshare confirmed | Show success toast "Reshare request cancelled successfully" | - | - |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Copy buttons shall copy the full value to clipboard |
| **NFR-2** | Public keys shall be truncated with maximum width of 200px |
| **NFR-3** | Address truncation shall use format: first 6 characters + "..." + last 4 characters |

## Test Plan

### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **UT-1** | Render vault detail with active status | Reshare and Sign Message buttons visible |
| **UT-2** | Render vault detail with draft status | Reshare button hidden, pending state shown |
| **UT-3** | Render vault with pending reshare | Warning banner displays with approval status |
| **UT-4** | Render vault info grid | Created, Last Used, Signatures count displayed |
| **UT-5** | Render linked identity | Identity card shows correct icon and KYC status |
| **UT-6** | Render curves section for active vault | Curves grid displays with copy buttons |
| **UT-7** | Render curves section for draft vault | Pending key generation message displayed |
| **UT-8** | Render signers table | All signers with correct device icons and voting power |

### Browser Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **BT-1** | Switch between tabs | Correct tab content displayed, URL updates |
| **BT-2** | Click copy button on fingerprint | Value copied to clipboard |
| **BT-3** | Click copy button on public key | Value copied to clipboard |
| **BT-4** | Click address row | Navigates to address detail page |
| **BT-5** | Click "New Address" button | Navigates to new address form |
| **BT-6** | Click linked identity | Navigates to identity detail page |
| **BT-7** | Click "Cancel Request" button | Confirmation dialog opens |
| **BT-8** | Confirm cancel reshare | Toast displayed, banner removed |
| **BT-9** | Deep link to specific tab | Correct tab selected on page load |

### E2E Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **E2E-1** | Load vault detail page | Vault data fetched and displayed from API |
| **E2E-2** | Navigate from vaults list to detail | Breadcrumbs show correct vault name |
| **E2E-3** | View vault with addresses | Addresses tab shows real address data |
| **E2E-4** | View vault with signatures | Signatures tab shows real signature history |
| **E2E-5** | Click Reshare button | Navigates to reshare form with pre-filled data |
| **E2E-6** | Cancel pending reshare | API called, UI updates to remove banner |
