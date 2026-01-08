import type { EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { APITestClient } from '@/tests/utils/testApiClient.js';

export interface TestUser {
  clientId: string;
  clientSecret: string;
  organisationId: string;
  vaultId: string;
  addresses: {
    // not changing this for now not to break integration tests
    evm?: string;
    btc?: string;
    solana?: string;
    tvm?: string;
    xrp?: string;
  };
  // but should be changed to:
  addressesInfo?: AddressInfo[];
}
export type TestUsers = Record<string, TestUser>;
export type AuthenticatedUser = { user: TestUser; client: APITestClient };

// Type for the default test clients setup with known keys
export interface DefaultAuthenticatedClients {
  CLIENT_1: AuthenticatedUser;
  CLIENT_2: AuthenticatedUser;
  [key: string]: AuthenticatedUser;
}

export interface AddressInfo {
  address: string;
  ecosystem: EcoSystem;
  chains?: ChainInfo[];
  native: ValidNative;
  minValue?: string; // should be "<number>"
  hdAddresses?: HDAddressInfo[]; // these should have some assets for testing purposes
  realTimeSupport?: boolean;
  enabled: boolean; // used to disable whole ecosystem in tests, ie: disable EVM
}

export interface ChainInfo {
  name: ValidChains;
  native: ValidNative;
  minValue?: string; // should be "<number>"
  tokens: TokenInfo[];
  importantTokens?: string[];
  hdAddresses?: HDAddressInfo[]; // these should have some assets for testing purposes
  realTimeSupport?: boolean;
  enabled: boolean; // used to disable whole chains in tests, ie: disable POLYGON
}

export interface HDAddressInfo {
  address: string;
  derivationPath: string;
}

export interface HDAddressInfo {
  address: string;
  derivationPath: string;
  tokensWithBalance: { chainName: ValidChains; tokenName: string }[];
}

export interface TokenInfo {
  name: string;
  minValue?: string; // should be "<number>"
  contract: string;
  decimals: number;
  enabled: boolean; // used to disable a token in tests, ie: disable USDC
}

export enum ValidNative {
  MNEE = 'MNEE',
  ETH = 'ETH',
  Ripple = 'Ripple',
  Sol = 'Sol',
  POL = 'POL',
  AVAX = 'AVAX',
  Arbitrum = 'Arbitrum',
  BNB = 'BNB',
  OP = 'OP',
  FTM = 'FTM',
  SOLANA = 'SOLANA',
  TRON = 'TRON',
}

export enum ValidChains {
  ETH = 'ETH',
  ETH_SEPOLIA = 'ETH_SEPOLIA',
  IOCHAIN = 'IOCHAIN',
  IOCHAIN_TESTNET = 'IOCHAIN_TESTNET',
  POLYGON = 'POLYGON',
  BSC = 'BSC',
  AVALANCHE_C = 'AVALANCHE-C',
  ARBITRUM = 'ARBITRUM',
  FANTOM = 'FANTOM',
  BASE = 'BASE',
  OPTIMISM = 'OPTIMISM',
  TRON = 'TRON',
  BTC = 'BTC',
  BTC_TESTNET = 'BTC_TESTNET',
  SOLANA = 'SOLANA',
  TAO = 'TAO',
  MNEE = 'MNEE',
  Ripple = 'Ripple',
}
