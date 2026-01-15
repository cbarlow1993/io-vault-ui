# Vaults List

**Status:** Provisional
**Last Updated:** 2026-01-15

## Overview

Users can view and manage their vaults from a paginated list. The page displays summary statistics, provides filtering capabilities by status and search term, and allows navigation to individual vault details. Each vault is a Multi-Party Computation (MPC) key share container that can generate cryptographic signatures.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall display a summary card grid showing total vaults count, active vaults count, draft vaults count, and archived vaults count |
| **FR-2** | The system shall provide a search input to filter vaults by name |
| **FR-3** | The system shall provide a status dropdown filter with options: All Status, Active, Draft, Archived |
| **FR-4** | The system shall display a "Clear" button when any filters are active |
| **FR-5** | The system shall display the count of filtered results (e.g., "5 results") |
| **FR-6** | The system shall display vaults in a table with columns: Name, Status, Signatures, Created, Last Used, Actions |
| **FR-7** | Each vault row shall display the vault name and the creator's name |
| **FR-8** | Each vault row shall display a status badge (active, draft, archived) with appropriate color coding |
| **FR-9** | Each vault row shall display the signature count |
| **FR-10** | Each vault row shall display the creation date |
| **FR-11** | Each vault row shall display the last used date or "Never" if never used |
| **FR-12** | Clicking a vault row shall navigate to the vault detail page |
| **FR-13** | Each vault row shall have an actions dropdown menu with options: View Addresses, View Signatures, Manage Vault, Archive Vault |
| **FR-14** | The "Create Vault" button shall navigate to the vault creation form |
| **FR-15** | The system shall paginate results with configurable page sizes (5, 10, 25, 50 rows) |
| **FR-16** | The pagination controls shall include: first page, previous page, page numbers with ellipsis, next page, last page buttons |
| **FR-17** | The system shall display current position (e.g., "1-5 of 12") in pagination |
| **FR-18** | Changing filters shall reset the page to 1 |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | API request fails | Display "Failed to load vaults" with retry button | - | - |
| **VR-2** | No vaults match filters | Display "No vaults found matching your filters." | - | - |
| **VR-3** | Loading state | Display "Loading vaults..." placeholder | - | - |
| **VR-4** | Successful response | Display paginated vault list | 200 OK | - |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | The page shall fetch up to 50 vaults initially for client-side pagination |
| **NFR-2** | Status badges shall use consistent color coding: active=positive, draft=warning, archived=neutral |
| **NFR-3** | Vault rows shall have hover state for interactivity indication |

## Test Plan

### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **UT-1** | Render vaults list with mock data | Table displays all vault columns correctly |
| **UT-2** | Filter vaults by status "active" | Only active vaults are displayed |
| **UT-3** | Filter vaults by search term | Only matching vaults are displayed |
| **UT-4** | Clear filters resets to default state | All vaults displayed, search cleared |
| **UT-5** | Change page size | Correct number of rows displayed per page |
| **UT-6** | Navigate pages | Correct subset of vaults displayed |

### Browser Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **BT-1** | Click vault row | Navigates to vault detail page |
| **BT-2** | Click "Create Vault" button | Navigates to vault creation form |
| **BT-3** | Open actions dropdown | Menu displays all options |
| **BT-4** | Click "View Addresses" action | Navigates to vault with addresses tab |
| **BT-5** | Click pagination buttons | Page updates correctly |
| **BT-6** | Type in search input | Results filter as user types |

### E2E Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **E2E-1** | Load vaults list page | Summary cards and table populated from API |
| **E2E-2** | Filter by status | API called with status parameter |
| **E2E-3** | Search vaults | API called with search parameter |
| **E2E-4** | Navigate to vault detail | Vault detail page loads with correct data |
| **E2E-5** | Create new vault flow | Navigates through creation and back to list |
