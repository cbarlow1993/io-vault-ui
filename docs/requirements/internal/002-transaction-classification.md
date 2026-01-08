# Transaction Classification

**Status:** Accepted
**Last Updated:** 2026-01-07

## Overview

The Transaction Classification system analyzes raw blockchain transactions to determine their type (transfer, swap, stake, etc.), direction relative to a specific address (in, out, neutral), and generates human-readable labels. Classification uses a tiered approach with custom classifiers for common patterns and Noves API fallback for complex DeFi interactions.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall classify transactions into one of the following types: `transfer`, `swap`, `bridge`, `stake`, `mint`, `burn`, `approve`, `contract_deploy`, `nft_transfer`, or `unknown`. |
| **FR-2** | The system shall calculate transaction direction (`in`, `out`, `neutral`) from the perspective of a specified address. |
| **FR-3** | The system shall generate human-readable labels that reflect both type and direction (e.g., "Received 100 ETH", "Staked 50 SOL", "Swapped USDC"). |
| **FR-4** | The system shall support EVM-based chains with log-based transfer detection and method signature analysis. |
| **FR-5** | The system shall support Solana (SVM) transactions with instruction and balance delta analysis. |
| **FR-6** | The system shall use Noves API as a fallback classifier when custom classification returns `unknown` or low confidence. |
| **FR-7** | The system shall parse and extract individual token transfers from complex transactions (including multi-transfer swaps). |
| **FR-8** | The system shall assign confidence levels (`high`, `medium`, `low`) based on classification certainty. |
| **FR-9** | The system shall identify the source of classification (`custom` or `noves`) in the result. |
| **FR-10** | The system shall format token amounts using the correct decimal precision for display. |

## Classification Type Definitions

| Type | Description | Direction Logic |
|------|-------------|-----------------|
| `transfer` | Native or token transfer between addresses | `in` if recipient, `out` if sender |
| `swap` | Token exchange (DEX trade) | Always `neutral` |
| `bridge` | Cross-chain asset transfer | Calculate from transfers |
| `stake` | Staking/unstaking operations | `out` = staking, `in` = unstaking |
| `mint` | Token/NFT minting | Always `in` |
| `burn` | Token/NFT burning | Always `out` |
| `approve` | ERC-20/SPL token approval | Always `neutral` |
| `contract_deploy` | Smart contract deployment | Always `neutral` |
| `nft_transfer` | NFT transfer | `in` if recipient, `out` if sender |
| `unknown` | Unclassifiable transaction | Always `neutral` |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Transaction hash not found on chain | Classification fails | `TX_NOT_FOUND` | |
| **VR-2** | Unsupported chain type | Returns `unknown` with low confidence | - | |
| **VR-3** | Noves API unavailable | Uses custom classification only | - | |
| **VR-4** | No perspective address provided | Direction defaults to `neutral` | - | |
| **VR-5** | Classification succeeds | Returns complete ClassificationResult | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Custom classification shall complete within 50ms for cached chain data. |
| **NFR-2** | Noves API fallback shall be used only when necessary to minimize external API calls. |
| **NFR-3** | Classification results shall be deterministic for the same transaction and perspective address. |
| **NFR-4** | The system shall handle failed transactions (status: failed) without throwing errors. |
| **NFR-5** | Amount formatting shall preserve precision while removing unnecessary trailing zeros. |

## EVM Classification Signals

| Signal | Detection Method | Classification |
|--------|------------------|----------------|
| ERC-20 Transfer | `Transfer(address,address,uint256)` log | `transfer` |
| ERC-721 Transfer | `Transfer(address,address,uint256)` from NFT contract | `nft_transfer` |
| ERC-1155 Transfer | `TransferSingle`/`TransferBatch` log | `nft_transfer` |
| Native Transfer | `value > 0` with empty input | `transfer` |
| Token Approval | `Approval(address,address,uint256)` log | `approve` |
| Contract Creation | `to === null` | `contract_deploy` |
| Swap | Multiple Transfer logs with known DEX router | `swap` |

## SVM Classification Signals

| Signal | Detection Method | Classification |
|--------|------------------|----------------|
| SOL Transfer | Balance delta in pre/post balances | `transfer` |
| SPL Transfer | Token balance changes in token accounts | `transfer` |
| Stake Instruction | Stake program invocation | `stake` |
| Token Mint | Mint authority instruction | `mint` |
| Token Burn | Burn instruction | `burn` |

## Open Questions

None - implementation is complete.

---

## Implementation Status

### Completed Components

| Component | Location | Status |
|-----------|----------|--------|
| ClassifierRegistry | `src/services/transaction-processor/classifier/index.ts` | Complete |
| EvmClassifier | `src/services/transaction-processor/classifier/evm-classifier.ts` | Complete |
| SvmClassifier | `src/services/transaction-processor/classifier/svm-classifier.ts` | Complete |
| NovesClassifier | `src/services/transaction-processor/classifier/noves-classifier.ts` | Complete |
| Direction Calculator | `src/services/transaction-processor/classifier/direction.ts` | Complete |
| Label Generator | `src/services/transaction-processor/classifier/label.ts` | Complete |
| Type Definitions | `src/services/transaction-processor/types.ts` | Complete |

### Test Coverage

| Test File | Coverage |
|-----------|----------|
| `tests/unit/services/transaction-processor/classifier/direction.test.ts` | All direction logic |
| `tests/unit/services/transaction-processor/classifier/label.test.ts` | Label generation |
| `tests/unit/services/transaction-processor/classifier/evm-classifier.test.ts` | EVM classification |
| `tests/unit/services/transaction-processor/classifier/svm-classifier.test.ts` | SVM classification |
