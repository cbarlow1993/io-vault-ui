# Create HD Address

**Status:** Draft
**Last Updated:** 2026-01-02

## Overview

Users can create a new HD (Hierarchical Deterministic) wallet address derived from the vault's root key using BIP-32 derivation. The system derives the address using the specified derivation path and registers it for monitoring.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system must accept a POST request to `/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chain}/hd-addresses` |
| **FR-2** | The request body must include `derivationPath` in BIP-32 format (e.g., `m/44'/60'/0'/0/0`) |
| **FR-3** | The request body may include an optional `alias` field (1-64 characters) |
| **FR-4** | The system must derive the public key and address from the vault's root key using the specified path |
| **FR-5** | The derived address must be validated against chain-specific format requirements |
| **FR-6** | The system must store the address with a reference to its parent (root) address and derivation path |
| **FR-7** | The system must automatically subscribe the derived address for transaction monitoring |
| **FR-8** | The response must include the derived `address`, `derivationPath`, `chain`, `ecosystem`, and `monitoredAt` |
| **FR-9** | The system must track the relationship between root and child addresses |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User is not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | User lacks permission to create addresses in this vault | 403 Forbidden | `FORBIDDEN` | |
| **VR-3** | Vault ID does not exist | 404 Not Found | `VAULT_NOT_FOUND` | |
| **VR-4** | Derivation path is not provided | 400 Bad Request | `VALIDATION_ERROR` | `VALUE_REQUIRED` |
| **VR-5** | Derivation path format is invalid | 400 Bad Request | `VALIDATION_ERROR` | `DERIVATION_PATH_FORMAT_INVALID` |
| **VR-6** | Ecosystem is not supported | 400 Bad Request | `ECOSYSTEM_NOT_SUPPORTED` | |
| **VR-7** | Chain is not supported for the specified ecosystem | 400 Bad Request | `CHAIN_NOT_SUPPORTED` | |
| **VR-8** | Vault does not have a root key for this chain/curve | 400 Bad Request | `ROOT_KEY_NOT_FOUND` | |
| **VR-9** | Address at this derivation path already exists | 409 Conflict | `ADDRESS_ALREADY_EXISTS` | |
| **VR-10** | Alias exceeds 64 characters | 400 Bad Request | `VALIDATION_ERROR` | `STRING_LENGTH_INVALID` |
| **VR-11** | Successful creation | 201 Created | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | HD address derivation must complete within 3 seconds |
| **NFR-2** | The derivation must be deterministic - the same path always produces the same address |
| **NFR-3** | Private key material must never be logged or returned in API responses |

## Open Questions

1. Should the system validate that the derivation path follows standard conventions for the ecosystem (e.g., BIP-44 for EVM)?
