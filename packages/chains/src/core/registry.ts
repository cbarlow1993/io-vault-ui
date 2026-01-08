// packages/chains/src/core/registry.ts
import { CHAIN_ECOSYSTEM_MAP, type ChainAlias, type Ecosystem } from './types.js';

const VALID_ECOSYSTEMS: readonly Ecosystem[] = ['evm', 'svm', 'utxo', 'tvm', 'xrp', 'substrate'];

export function getEcosystem(chainAlias: ChainAlias): Ecosystem {
  return CHAIN_ECOSYSTEM_MAP[chainAlias];
}

export function isValidChainAlias(value: string): value is ChainAlias {
  return value in CHAIN_ECOSYSTEM_MAP;
}

export function isValidEcosystem(value: string): value is Ecosystem {
  return VALID_ECOSYSTEMS.includes(value as Ecosystem);
}

export function getAllChainAliases(): ChainAlias[] {
  return Object.keys(CHAIN_ECOSYSTEM_MAP) as ChainAlias[];
}

export function getChainAliasesByEcosystem(ecosystem: Ecosystem): ChainAlias[] {
  return getAllChainAliases().filter(
    (chainAlias) => CHAIN_ECOSYSTEM_MAP[chainAlias] === ecosystem
  );
}
