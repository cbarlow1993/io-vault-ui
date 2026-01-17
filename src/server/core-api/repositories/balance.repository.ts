import { coreApiClient } from '../client';
import {
  AddressNotFoundError,
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiSessionExpiredError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
} from '../errors';
import type { ChainAlias, Ecosystem } from '../types';

export class BalanceRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async getNative(
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    address: string
  ) {
    const { data, response } = await coreApiClient.GET(
      '/v2/balances/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}/native',
      {
        headers: this.headers,
        params: { path: { ecosystem, chainAlias, address } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new AddressNotFoundError(address);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async getTokens(
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    address: string
  ) {
    const { data, response } = await coreApiClient.GET(
      '/v2/balances/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}/tokens',
      {
        headers: this.headers,
        params: { path: { ecosystem, chainAlias, address } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new AddressNotFoundError(address);
      }
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
