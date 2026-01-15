# Vault Reshare

**Status:** Provisional
**Last Updated:** 2026-01-15

## Overview

Users can modify an existing vault's signer configuration and threshold by creating a reshare request. Reshare requests require approval from existing vault signers before taking effect. This allows adding/removing signers, adjusting voting power, and changing the signing threshold. The reshare form reuses the vault creation form in "edit" mode.

## Functional Requirements

### Header and Navigation

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall display a back arrow button that navigates to the vault detail page |
| **FR-2** | The system shall display the page title "Reshare Vault" |
| **FR-3** | The system shall display a "Cancel" button that navigates back to vault detail |
| **FR-4** | The system shall display a "Request Reshare" submit button |

### Mode Description Banner

| ID | Requirement |
|----|-------------|
| **FR-5** | The system shall display a warning banner explaining the reshare process |
| **FR-6** | The banner shall state: "Reshare Request" as title |
| **FR-7** | The banner shall explain: "Modifying signers or threshold requires approval from existing vault signers. Once submitted, all current signers will be notified to approve this change." |

### Vault Name Section

| ID | Requirement |
|----|-------------|
| **FR-8** | The system shall display the current vault name as read-only text |
| **FR-9** | The system shall display helper text: "Vault name cannot be changed during reshare" |

### Linked Identity Section

| ID | Requirement |
|----|-------------|
| **FR-10** | The system shall allow changing the linked identity during reshare |
| **FR-11** | The identity selection functionality shall be identical to vault create |

### Signing Threshold Section

| ID | Requirement |
|----|-------------|
| **FR-12** | The threshold section shall be pre-populated with the current vault threshold |
| **FR-13** | The threshold adjustment functionality shall be identical to vault create |

### Signers Section

| ID | Requirement |
|----|-------------|
| **FR-14** | The signers section shall be pre-populated with the current vault signers and their voting power |
| **FR-15** | Users can add new signers from available signers |
| **FR-16** | Users can remove existing signers |
| **FR-17** | Users can adjust voting power for any signer |
| **FR-18** | The signer management functionality shall be identical to vault create |

### Form Validation and Submission

| ID | Requirement |
|----|-------------|
| **FR-19** | The "Request Reshare" button shall be disabled when form is invalid |
| **FR-20** | Form validation rules are identical to vault create (signers required, valid threshold) |
| **FR-21** | The "Request Reshare" button shall display "Submitting..." while submitting |
| **FR-22** | On successful submission, navigate to the reshare detail page |
| **FR-23** | On successful submission, display success toast: "Reshare request submitted successfully" |
| **FR-24** | On submission failure, display error toast with error message |

### API Payload

| ID | Requirement |
|----|-------------|
| **FR-25** | The reshare request shall include: vaultId, threshold, signers array (signerKey, signingPower) |
| **FR-26** | The reshare request may optionally include: expiresAt, memo |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Vault not found | Display "Vault Not Found" with link to vaults list | 404 | - |
| **VR-2** | No signers selected | Disable submit button | - | `VALUE_REQUIRED` |
| **VR-3** | Threshold < 1 | Disable submit button | - | `VALUE_INVALID` |
| **VR-4** | Threshold > total voting power | Disable submit button | - | `VALUE_INVALID` |
| **VR-5** | API returns error | Display error toast | 4xx/5xx | - |
| **VR-6** | Successful submission | Navigate to reshare detail, show success toast | 201 | - |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Form shall be pre-populated with existing vault configuration |
| **NFR-2** | The vault name field shall be visually distinct as read-only |
| **NFR-3** | The reshare form shares component implementation with vault create form |

## Test Plan

### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **UT-1** | Render reshare form with vault data | Form pre-populated with existing config |
| **UT-2** | Vault name is read-only | Name cannot be edited, helper text shown |
| **UT-3** | Warning banner displayed | Reshare explanation visible |
| **UT-4** | Modify threshold | Threshold updates, validation runs |
| **UT-5** | Add new signer | Signer added to existing list |
| **UT-6** | Remove existing signer | Signer removed from list |
| **UT-7** | Change signer voting power | Voting power updates |
| **UT-8** | Form validation | Submit enabled/disabled based on validity |

### Browser Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **BT-1** | Click Cancel button | Navigates back to vault detail |
| **BT-2** | Click back arrow | Navigates back to vault detail |
| **BT-3** | Add signer from dropdown | Signer added to table |
| **BT-4** | Remove signer from table | Signer removed, available in dropdown |
| **BT-5** | Submit reshare request | Loading state, then navigation |
| **BT-6** | Attempt to edit vault name | No interaction possible |

### E2E Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **E2E-1** | Navigate from vault detail to reshare | Form loads with current vault config |
| **E2E-2** | Submit reshare with new signer | Reshare created, navigates to detail |
| **E2E-3** | Submit reshare with removed signer | Reshare created with modified signers |
| **E2E-4** | Submit reshare with changed threshold | Reshare created with new threshold |
| **E2E-5** | Handle API error | Error toast displayed, form preserved |
| **E2E-6** | Access reshare for non-existent vault | Not found state displayed |
