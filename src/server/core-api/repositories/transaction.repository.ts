import { coreApiClient } from '../client';
import {
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiNotFoundError,
  CoreApiSessionExpiredError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
} from '../errors';
import type {
  BuildDurableNonceTransactionInput,
  BuildNativeTransactionInput,
  BuildTokenTransactionInput,
  ChainAlias,
  Ecosystem,
  paths,
  ScanTransactionInput,
  SubmitTransactionInput,
  TransactionListParams,
} from '../types';

// Extract specific ecosystem/chainAlias types from paths that have more restricted types
type ScanEcosystem =
  paths['/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/scan-transaction']['post']['parameters']['path']['ecosystem'];
type ScanChainAlias =
  paths['/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/scan-transaction']['post']['parameters']['path']['chainAlias'];

export class TransactionRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async list(
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    address: string,
    params?: TransactionListParams
  ) {
    const { data, response } = await coreApiClient.GET(
      '/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}',
      {
        headers: this.headers,
        params: { path: { ecosystem, chainAlias, address }, query: params },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async get(
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    address: string,
    transactionHash: string
  ) {
    const { data, response } = await coreApiClient.GET(
      '/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}/transaction/{transactionHash}',
      {
        headers: this.headers,
        params: { path: { ecosystem, chainAlias, address, transactionHash } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new CoreApiNotFoundError('Transaction', transactionHash);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async scan(
    ecosystem: ScanEcosystem,
    chainAlias: ScanChainAlias,
    body: ScanTransactionInput
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/scan-transaction',
      {
        headers: this.headers,
        params: { path: { ecosystem, chainAlias } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async buildNative(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    body: BuildNativeTransactionInput
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/build-native-transaction',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async buildToken(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    body: BuildTokenTransactionInput
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/build-token-transaction',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async submit(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    body: SubmitTransactionInput
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/transaction',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async getDurableNonce(vaultId: string, derivationPath?: string) {
    const { data, response } = await coreApiClient.GET(
      '/v2/vaults/{vaultId}/transactions/ecosystem/svm/chain/solana/durable-nonce',
      {
        headers: this.headers,
        params: { path: { vaultId }, query: { derivationPath } },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async buildDurableNonceTransaction(
    vaultId: string,
    body: BuildDurableNonceTransactionInput
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/vaults/{vaultId}/transactions/ecosystem/svm/chain/solana/build-durable-nonce-transaction',
      {
        headers: this.headers,
        params: { path: { vaultId } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  private handleError(response: Response): never {
    const { status, statusText } = response;

    if (status === 401) {
      throw new CoreApiUnauthorizedError(statusText);
    }
    if (status === 403) {
      throw new CoreApiForbiddenError(statusText);
    }
    if (status === 419) {
      throw new CoreApiSessionExpiredError(statusText);
    }
    if (status === 400) {
      throw new CoreApiValidationError(statusText);
    }

    throw new CoreApiError(statusText, 'REQUEST_FAILED', status);
  }
}
