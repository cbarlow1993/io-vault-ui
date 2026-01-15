# Vault Create

**Status:** Provisional
**Last Updated:** 2026-01-15

## Overview

Users can create new MPC vaults by providing a name, selecting signers from available devices, configuring voting power for each signer, and setting a signing threshold. The vault is created in "draft" status and requires an initial reshare to activate. Optionally, users can link an identity and enable derived addresses.

## Functional Requirements

### Header and Navigation

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall display a back arrow button that navigates to the vaults list |
| **FR-2** | The system shall display the page title "Create Vault" |
| **FR-3** | The system shall display a "Cancel" button that navigates back to vaults list |
| **FR-4** | The system shall display a "Create Vault" submit button |

### Vault Name Section

| ID | Requirement |
|----|-------------|
| **FR-5** | The system shall display a "Vault Name" section with text input |
| **FR-6** | The vault name input shall have placeholder text "Enter vault name" |
| **FR-7** | Vault name is required for form submission |

### Linked Identity Section

| ID | Requirement |
|----|-------------|
| **FR-8** | The system shall display a "Linked Identity" section marked as optional |
| **FR-9** | The system shall display helper text: "Optionally associate this vault with a counterparty identity" |
| **FR-10** | The system shall provide a dropdown to select from available identities |
| **FR-11** | The dropdown shall display identity type icon (building for corporate, user for individual), name, type label, and KYC status |
| **FR-12** | When an identity is selected, the system shall display the selection with a remove (X) button |

### Allow Derived Addresses Section

| ID | Requirement |
|----|-------------|
| **FR-13** | The system shall display an "Allow Derived Addresses" toggle section |
| **FR-14** | The toggle shall have helper text: "Enable generation of multiple addresses from this vault" |
| **FR-15** | The toggle default state shall be off |

### Signing Threshold Section

| ID | Requirement |
|----|-------------|
| **FR-16** | The system shall display a "Signing Threshold" section |
| **FR-17** | The system shall display helper text: "Minimum voting power required to sign transactions" |
| **FR-18** | The threshold shall be adjustable via increment/decrement buttons |
| **FR-19** | The threshold minimum value shall be 1 |
| **FR-20** | The threshold shall display the current value in a numeric input |
| **FR-21** | When threshold <= total voting power, display positive validation message: "Valid threshold (X of Y total voting power)" |
| **FR-22** | When threshold > total voting power, display warning message: "Threshold exceeds current voting power - add more signers" |
| **FR-23** | When no signers are selected, display neutral message: "Select signers below to validate threshold" |

### Signers Section

| ID | Requirement |
|----|-------------|
| **FR-24** | The system shall display a "Signers" section with header text: "Select devices to participate in threshold signing" |
| **FR-25** | The system shall display an "Add Signer" dropdown button |
| **FR-26** | The "Add Signer" dropdown shall list available signers fetched from the API |
| **FR-27** | Each signer in the dropdown shall display: device icon, name, device type label, owner name |
| **FR-28** | The dropdown shall display "Loading signers..." while fetching |
| **FR-29** | The dropdown shall display "No more signers available" when all signers are selected |
| **FR-30** | When no signers are selected, display empty state: "No signers added yet" with helper text |
| **FR-31** | Selected signers shall display in a table with columns: Device, Name, Owner, Version, Voting Power, Actions |
| **FR-32** | Voting power shall be adjustable via increment/decrement buttons per signer |
| **FR-33** | Voting power minimum value shall be 1 per signer |
| **FR-34** | Each signer row shall have a delete button to remove the signer |
| **FR-35** | The signers section shall display a summary row with total signer count and total voting power |

### Form Validation and Submission

| ID | Requirement |
|----|-------------|
| **FR-36** | The "Create Vault" button shall be disabled when form is invalid |
| **FR-37** | Form is valid when: name is not empty, at least one signer is selected, threshold >= 1, threshold <= total voting power |
| **FR-38** | The "Create Vault" button shall display "Creating..." while submitting |
| **FR-39** | On successful creation, navigate to the newly created vault detail page |
| **FR-40** | On successful creation, display success toast: "Vault created successfully" |
| **FR-41** | On creation failure, display error toast with error message |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Name is empty | Disable submit button | - | `VALUE_REQUIRED` |
| **VR-2** | No signers selected | Disable submit button | - | `VALUE_REQUIRED` |
| **VR-3** | Threshold < 1 | Disable submit button | - | `VALUE_INVALID` |
| **VR-4** | Threshold > total voting power | Disable submit button | - | `VALUE_INVALID` |
| **VR-5** | API returns error | Display error toast | 4xx/5xx | - |
| **VR-6** | Successful creation | Navigate to vault detail, show success toast | 201 | - |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | The signer list shall fetch up to 100 active signers |
| **NFR-2** | Device icons shall use Server for virtual signers, Smartphone for iOS/Android |
| **NFR-3** | The form state shall not persist on navigation away |

## Test Plan

### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **UT-1** | Render empty create form | All sections displayed, submit button disabled |
| **UT-2** | Enter vault name | Name input updates, form validation recalculates |
| **UT-3** | Toggle derived addresses | Toggle state changes |
| **UT-4** | Increment/decrement threshold | Threshold value updates correctly |
| **UT-5** | Threshold cannot go below 1 | Decrement button disabled at minimum |
| **UT-6** | Threshold exceeds voting power | Warning message displayed |
| **UT-7** | Add signer from dropdown | Signer appears in table with voting power 1 |
| **UT-8** | Remove signer | Signer removed from table, returns to dropdown |
| **UT-9** | Adjust signer voting power | Voting power updates, total recalculates |
| **UT-10** | Voting power minimum is 1 | Decrement button disabled at minimum |
| **UT-11** | Form validation with valid data | Submit button enabled |
| **UT-12** | Form validation with invalid data | Submit button disabled |

### Browser Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **BT-1** | Open identity dropdown | Shows list of identities with icons |
| **BT-2** | Select identity | Identity displayed with remove button |
| **BT-3** | Remove selected identity | Dropdown shown again |
| **BT-4** | Open Add Signer dropdown | Shows available signers |
| **BT-5** | Click Add Signer on signer | Signer added to table |
| **BT-6** | Click delete on signer row | Signer removed |
| **BT-7** | Click Cancel button | Navigates back to vaults list |
| **BT-8** | Click back arrow | Navigates back to vaults list |
| **BT-9** | Submit valid form | Loading state shown, then navigation |

### E2E Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| **E2E-1** | Navigate to create vault page | Form loads with signers from API |
| **E2E-2** | Create vault with minimum data | Vault created, navigates to detail page |
| **E2E-3** | Create vault with all options | Vault created with identity and settings |
| **E2E-4** | Create vault with multiple signers | All signers included in API request |
| **E2E-5** | Handle API error | Error toast displayed, form remains |
| **E2E-6** | Verify vault appears in list | New vault visible in vaults list |
