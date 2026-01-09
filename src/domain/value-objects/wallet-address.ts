import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { InvalidAddressError } from './errors.js';

/** Branded type for normalized (lowercase, trimmed) addresses */
declare const NormalizedAddressBrand: unique symbol;
export type NormalizedAddress = string & { readonly [NormalizedAddressBrand]: never };

/** Chain type categorization for address validation */
type ChainType = 'evm' | 'solana' | 'bitcoin' | 'unknown';

/**
 * Maps chain aliases to their chain type for validation purposes.
 * EVM chains require 0x prefix, Solana uses base58, Bitcoin has specific formats.
 */
const CHAIN_TYPE_MAP: Record<string, ChainType> = {
  // EVM chains - require 0x prefix
  eth: 'evm',
  'eth-mainnet': 'evm',
  'eth-sepolia': 'evm',
  'eth-goerli': 'evm',
  ethereum: 'evm',
  polygon: 'evm',
  'polygon-mainnet': 'evm',
  'polygon-amoy': 'evm',
  arbitrum: 'evm',
  'arbitrum-one': 'evm',
  'arbitrum-nova': 'evm',
  'arbitrum-sepolia': 'evm',
  optimism: 'evm',
  'optimism-mainnet': 'evm',
  'optimism-sepolia': 'evm',
  base: 'evm',
  'base-mainnet': 'evm',
  'base-sepolia': 'evm',
  bsc: 'evm',
  'bsc-mainnet': 'evm',
  'bsc-testnet': 'evm',
  'avalanche-c': 'evm',
  'avalanche-fuji': 'evm',
  fantom: 'evm',
  gnosis: 'evm',
  'zksync-era': 'evm',
  linea: 'evm',
  scroll: 'evm',
  blast: 'evm',
  zora: 'evm',
  cronos: 'evm',
  fuse: 'evm',
  metis: 'evm',
  fraxtal: 'evm',
  xdc: 'evm',
  dfk: 'evm',
  'metal-l2': 'evm',
  morph: 'evm',
  quai: 'evm',
  abstract: 'evm',
  ink: 'evm',
  lightlink: 'evm',
  'polygon-zkevm': 'evm',
  rari: 'evm',
  'manta-pacific': 'evm',
  lukso: 'evm',
  sonic: 'evm',
  berachain: 'evm',
  degen: 'evm',
  xai: 'evm',
  'flow-evm': 'evm',

  // Solana chains - base58 encoding, 32-44 chars
  solana: 'solana',
  'solana-mainnet': 'solana',
  'solana-devnet': 'solana',
  'solana-testnet': 'solana',

  // Bitcoin chains - P2PKH, P2SH, Bech32, Taproot formats
  bitcoin: 'bitcoin',
  'btc-mainnet': 'bitcoin',
  'btc-testnet': 'bitcoin',
};

/**
 * Immutable value object representing a wallet address on a specific chain.
 *
 * Consolidates address normalization logic from:
 * - src/lib/lowercase.ts:1 (lowercase utility)
 * - src/repositories/address.repository.ts:73 (LOWER(address))
 * - src/services/transactions/transfer-enricher.ts:39 (perspectiveAddress.toLowerCase())
 * - src/services/spam/spam-classification-service.ts:34 (token.address.toLowerCase())
 *
 * Automatically normalizes addresses to lowercase for consistent comparison
 * while preserving original case for display purposes where needed.
 *
 * @example
 * const addr = WalletAddress.create('0xAbC123...def', 'ethereum');
 * addr.normalized; // "0xabc123...def"
 * addr.original; // "0xAbC123...def"
 * addr.equals(otherAddr); // true if same normalized address and chain
 *
 * @example
 * // Use in Maps/Sets
 * const balances = new Map<string, Balance>();
 * balances.set(addr.normalized, balance);
 */
export class WalletAddress {
  public readonly normalized: NormalizedAddress;

  private constructor(
    public readonly original: string,
    public readonly chainAlias: ChainAlias
  ) {
    this.normalized = original.toLowerCase().trim() as NormalizedAddress;
    Object.freeze(this);
  }

  /**
   * Create a wallet address with validation
   *
   * @param address - The wallet address string
   * @param chainAlias - The chain this address belongs to
   * @throws InvalidAddressError if address is empty or invalid
   */
  static create(address: string, chainAlias: ChainAlias): WalletAddress {
    if (!address || typeof address !== 'string') {
      throw new InvalidAddressError(address ?? '', chainAlias);
    }
    const trimmed = address.trim();
    if (trimmed.length === 0) {
      throw new InvalidAddressError('', chainAlias);
    }

    // Perform chain-aware validation
    const chainType = WalletAddress.getChainType(chainAlias);
    WalletAddress.validateForChainType(trimmed, chainType, chainAlias);

    return new WalletAddress(trimmed, chainAlias);
  }

  /**
   * Get the chain type for a given chain alias
   */
  private static getChainType(chainAlias: ChainAlias): ChainType {
    return CHAIN_TYPE_MAP[chainAlias] ?? 'unknown';
  }

  /**
   * Validate address format based on chain type
   */
  private static validateForChainType(
    address: string,
    chainType: ChainType,
    chainAlias: ChainAlias
  ): void {
    switch (chainType) {
      case 'evm':
        WalletAddress.validateEvmAddress(address, chainAlias);
        break;
      case 'solana':
        WalletAddress.validateSolanaAddress(address, chainAlias);
        break;
      case 'bitcoin':
        WalletAddress.validateBitcoinAddress(address, chainAlias);
        break;
      case 'unknown':
        // Permissive validation for unknown chains - accept any non-empty address
        break;
    }
  }

  /**
   * Validate EVM address format (must be 0x followed by exactly 40 hex characters)
   */
  private static validateEvmAddress(address: string, chainAlias: ChainAlias): void {
    // EVM addresses must be 0x followed by exactly 40 hex characters (42 total)
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new InvalidAddressError(
        address,
        chainAlias,
        'EVM addresses must be 0x followed by 40 hex characters'
      );
    }
  }

  /**
   * Validate Solana address format (base58, 32-44 characters)
   * Base58 alphabet excludes: 0, O, I, l
   */
  private static validateSolanaAddress(address: string, chainAlias: ChainAlias): void {
    // Check length first (32-44 characters)
    if (address.length < 32 || address.length > 44) {
      throw new InvalidAddressError(
        address,
        chainAlias,
        'Solana addresses must be 32-44 characters'
      );
    }

    // Check for invalid base58 characters (0, O, I, l)
    const invalidBase58Chars = /[0OIl]/;
    if (invalidBase58Chars.test(address)) {
      throw new InvalidAddressError(
        address,
        chainAlias,
        'Solana addresses must be valid base58 (no 0, O, I, l characters)'
      );
    }
  }

  /**
   * Validate Bitcoin address format
   * Supports: P2PKH (1), P2SH (3), Bech32 (bc1), Taproot (bc1p), Testnet (m, n, tb1)
   */
  private static validateBitcoinAddress(address: string, chainAlias: ChainAlias): void {
    // Valid Bitcoin address prefixes
    const validPrefixes = [
      '1', // P2PKH mainnet
      '3', // P2SH mainnet
      'bc1q', // Bech32 mainnet (SegWit v0)
      'bc1p', // Taproot mainnet (SegWit v1)
      'm', // P2PKH testnet
      'n', // P2PKH testnet
      '2', // P2SH testnet
      'tb1', // Bech32 testnet
    ];

    const isValid = validPrefixes.some((prefix) => address.startsWith(prefix));

    if (!isValid) {
      throw new InvalidAddressError(address, chainAlias, 'Invalid Bitcoin address format');
    }
  }

  /**
   * Create from already-normalized address (trusted source like database)
   */
  static fromNormalized(normalized: string, chainAlias: ChainAlias): WalletAddress {
    return new WalletAddress(normalized, chainAlias);
  }

  /**
   * Check equality with another WalletAddress (same chain and normalized value)
   */
  equals(other: WalletAddress): boolean {
    return this.normalized === other.normalized && this.chainAlias === other.chainAlias;
  }

  /**
   * Check if this address matches a raw string (case-insensitive)
   */
  matches(address: string): boolean {
    return this.normalized === address.toLowerCase().trim();
  }

  /**
   * Get the address for database storage (normalized)
   */
  forStorage(): NormalizedAddress {
    return this.normalized;
  }

  /**
   * Get display-friendly representation
   */
  get display(): string {
    return this.original;
  }

  /**
   * Serialize for API responses
   */
  toJSON(): { address: string; chainAlias: ChainAlias } {
    return {
      address: this.normalized,
      chainAlias: this.chainAlias,
    };
  }

  toString(): string {
    return this.normalized;
  }
}
