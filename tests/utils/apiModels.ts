import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

export type CreateHexResponse = {
  serializedTransaction: string[];
  marshalledHex: string;
};

type TheHolyTrinity = {
  vaultId: string;
  ecosystem: string;
  chain: string;
};

type CreateHexBase = TheHolyTrinity & {
  to: string;
  amount: string;
  derivationPath?: string;
};

export type TokenHexParams = CreateHexBase & {
  type: 'token';
  decimals: number;
  contract: string;
};

export type NativeHexParams = CreateHexBase & {
  type: 'native';
};

export type FromHexParams = TheHolyTrinity & {
  hexInfo: CreateHexResponse;
};

export interface PageInfo {
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type CreateHDAddressParams = TheHolyTrinity & {
  derivationPath?: string;
};

export type CreateHDAddressResponse = TheHolyTrinity & {
  address: string;
  derivationPath: string;
};

export type RegisterAddressParams = CreateHDAddressResponse;

export type RegisterAddressResponse = TheHolyTrinity & {
  workspaceId: string;
  address: string;
  derivationPath: string;
  updatedAt: string;
  subscriptionId: string;
  tokens: any[];
};

export type ListVaultAddressesParams = {
  vaultId: string;
  after?: string;
};

export type ListVaultAddressesResponse = {
  data: RegisterAddressResponse[];
  pageInfo: PageInfo;
};

export type ListChainAddressesParams = TheHolyTrinity & {
  after?: string;
};

export type ListChainAddressesResponse = {
  data: CreateHDAddressResponse[];
  pageInfo: PageInfo;
};

export type BatchCreateHDAddressesParams = TheHolyTrinity & {
  indexFrom?: number;
  indexTo?: number;
};

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
}

export interface NFT {
  name: string;
  id: string;
  symbol: string;
  address: string;
}

export interface TransferParty {
  name: string | null;
  address: string;
}

export type TransferAction = 'sent' | 'received' | 'paidGas' | 'nftSpammed' | 'tokenSpammed';

export interface BaseTransfer {
  action: TransferAction;
  from: TransferParty;
  to: TransferParty;
  amount: string;
}

export interface TokenTransfer extends BaseTransfer {
  token: Token;
}

export interface NFTTransfer extends Omit<BaseTransfer, 'token'> {
  nft: NFT;
}

export type Transfer = TokenTransfer | NFTTransfer;

export interface TransactionFee {
  amount: string;
  token: Token;
}

export interface RawTransactionData {
  transactionHash: string;
  fromAddress: string;
  toAddress: string;
  blockNumber: number;
  gas: number;
  gasUsed: number;
  gasPrice: number;
  l1Gas?: number;
  l1GasPrice?: number;
  transactionFee: TransactionFee;
  timestamp: number;
}

export type ClassificationType =
  | 'sendToken'
  | 'receiveToken'
  | 'receiveSpamToken'
  | 'receiveSpamNFT';

export interface ClassificationSource {
  type: 'human';
}

export interface ClassificationProtocol {
  name: string | null;
}

export interface ClassificationData {
  type: ClassificationType;
  source: ClassificationSource;
  description: string;
  protocol: ClassificationProtocol;
}

export interface Transaction {
  chain: string;
  accountAddress: string;
  classificationData: ClassificationData;
  transfers: Transfer[];
  rawTransactionData: RawTransactionData;
}

export interface GetTransactionsResponse {
  data: Transaction[];
  pagination: PageInfo;
}

export type GetTransactionsParams = {
  ecosystem: string;
  chain: string;
  address: string;
  after?: string;
  first?: number;
};

export type GetBalanceParams = {
  ecosystem: string;
  chain: string;
  address: string;
  type: 'native' | 'tokens';
};

export type NativeBalanceResponse = {
  balance: string;
  symbol: string;
  lastUpdated: string;
  usdValue: string | null;
};

export type TokenBalance = {
  balance: string;
  symbol: string;
  decimals: number;
  address: string;
  name: string;
  usdValue: string | null;
  logo: string | null;
};

export type TokenBalanceResponse = {
  lastUpdated: string;
  data: TokenBalance[];
};

type FeatureStatus = 'coming-soon' | 'not-supported' | 'alpha' | 'beta' | 'ga';

export type ChainMeta = {
  chainAlias: ChainAlias;
  ecosystem: string;
  features: Record<string, FeatureStatus>;
  isTestnet?: boolean;
  testnet?: boolean; // some entries use this field
};

export interface SignatureResponse {
  data: Signature[];
  pageInfo: PageInfo;
}

export interface Signature {
  id: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  memo: string | null;
  errorCode: string;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  tags: null | Tag[];
}

interface Tag {
  name: string;
  value: string;
  mutable: boolean;
}
