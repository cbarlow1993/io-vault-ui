# Reconciliation Engine

**Status:** Accepted
**Last Updated:** 2026-01-07

## Overview

The Reconciliation Engine synchronizes on-chain transaction data with the local database by comparing transactions from external providers (e.g., Noves) against stored records. It identifies missing transactions, detects discrepancies, and flags orphaned records that exist locally but not on-chain.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall support two reconciliation modes: `full` (complete re-sync from genesis or earliest data) and `partial` (incremental sync from last checkpoint). |
| **FR-2** | Partial mode shall automatically upgrade to full mode when no checkpoint exists (i.e., `last_reconciled_block` is null). |
| **FR-3** | Partial mode shall apply a chain-specific reorg threshold when calculating the start block to ensure safety against chain reorganizations. |
| **FR-4** | The system shall enforce a one-job-per-address-chain policy, preventing duplicate concurrent reconciliation jobs for the same address and chain combination. |
| **FR-5** | The system shall support both synchronous (streaming) and asynchronous (Noves async jobs) processing modes based on provider capabilities and configuration. |
| **FR-6** | For each provider transaction not found locally, the system shall fetch, classify, and persist the transaction using the TransactionProcessor. |
| **FR-7** | For transactions existing both locally and in provider, the system shall compare key fields (fromAddress, toAddress, blockNumber, fee) and record discrepancies. |
| **FR-8** | For transactions existing locally but not in provider, the system shall record them as soft-deleted orphans in the audit log. |
| **FR-9** | The system shall save progress checkpoints periodically (every 100 transactions) to enable resumption after crashes or restarts. |
| **FR-10** | The system shall capture the current block height at job start and use it as the reconciliation checkpoint upon successful completion. |
| **FR-11** | The system shall maintain a complete audit log recording all actions: `added`, `soft_deleted`, `discrepancy`, and `error` entries. |
| **FR-12** | The system shall support parallel job processing up to a configurable `maxConcurrentJobs` limit. |
| **FR-13** | The system shall automatically detect and reset stale running jobs (jobs running longer than 1 hour) to pending status for retry. |
| **FR-14** | Async jobs shall timeout after a configurable period (default: 24 hours) and be marked as failed with audit entry. |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Provider not available for chain alias | Job creation fails | `PROVIDER_NOT_FOUND` | |
| **VR-2** | Active job already exists for address/chain | Replace pending job or reject running job | `JOB_ALREADY_RUNNING` | |
| **VR-3** | Transaction fetch from provider fails | Log error, increment error count, continue | - | |
| **VR-4** | Async job not ready (still processing) | Skip and retry on next poll cycle | - | |
| **VR-5** | Job completes successfully | Mark completed, update address checkpoint | - | |

### Validation Notes

- Chain-specific reorg thresholds are configured per chain alias (e.g., ETH: 32 blocks, Polygon: 128 blocks, Solana: 1 slot)
- Rate limiting is applied between provider requests (default: 1 request/second)
- Orphan detection in async mode is only performed for single-batch jobs to avoid false positives

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | The worker shall process jobs without blocking the main application event loop. |
| **NFR-2** | Progress checkpoints shall be persisted to PostgreSQL for crash recovery. |
| **NFR-3** | The system shall log all job lifecycle events (start, progress, completion, failure) with structured metadata. |
| **NFR-4** | The scheduler shall gracefully handle failures when scheduling jobs for individual addresses without affecting other addresses. |
| **NFR-5** | The worker shall wait for all active jobs to complete (with timeout) during graceful shutdown. |

## Open Questions

None - implementation is complete.

---

## Implementation Status

### Completed Components

| Component | Location | Status |
|-----------|----------|--------|
| ReconciliationService | `src/services/reconciliation/reconciliation-service.ts` | Complete |
| ReconciliationWorker | `src/services/reconciliation/reconciliation-worker.ts` | Complete |
| ReconciliationScheduler | `src/services/reconciliation/reconciliation-scheduler.ts` | Complete |
| NovesProvider | `src/services/reconciliation/providers/noves-provider.ts` | Complete |
| ProviderRegistry | `src/services/reconciliation/providers/registry.ts` | Complete |
| Config (reorg thresholds) | `src/services/reconciliation/config.ts` | Complete |
| SchedulerLock | `src/services/reconciliation/scheduler-lock.ts` | Complete |

### Supported Chains

- EVM Mainnets: eth-mainnet, polygon-mainnet, arbitrum-mainnet, optimism-mainnet, base-mainnet, avalanche-mainnet, bsc-mainnet, fantom-mainnet
- EVM Testnets: eth-sepolia, eth-holesky, polygon-amoy, arbitrum-sepolia, optimism-sepolia, base-sepolia
- UTXO: btc-mainnet, btc-testnet, ltc-mainnet, doge-mainnet
- Solana: solana-mainnet, solana-devnet
- XRP Ledger: xrpl-mainnet, xrpl-testnet
