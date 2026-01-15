import { coreApiClient } from '../client';
import {
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
} from '../errors';
import type { paths } from '../types';

type UpdateSpamOverridesInput =
  paths['/v2/addresses/{addressId}/tokens/spam-overrides']['patch']['requestBody']['content']['application/json'];
type UpdateSpamOverrideInput =
  paths['/v2/addresses/{addressId}/tokens/{tokenAddress}/spam-override']['patch']['requestBody']['content']['application/json'];

export class SpamOverrideRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async updateMany(addressId: string, body: UpdateSpamOverridesInput) {
    const { data, response } = await coreApiClient.PATCH(
      '/v2/addresses/{addressId}/tokens/spam-overrides',
      {
        headers: this.headers,
        params: { path: { addressId } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async update(
    addressId: string,
    tokenAddress: string,
    body: UpdateSpamOverrideInput
  ) {
    const { data, response } = await coreApiClient.PATCH(
      '/v2/addresses/{addressId}/tokens/{tokenAddress}/spam-override',
      {
        headers: this.headers,
        params: { path: { addressId, tokenAddress } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async delete(addressId: string, tokenAddress: string) {
    const { data, response } = await coreApiClient.DELETE(
      '/v2/addresses/{addressId}/tokens/{tokenAddress}/spam-override',
      {
        headers: this.headers,
        params: { path: { addressId, tokenAddress } },
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
    if (status === 400) {
      throw new CoreApiValidationError(statusText);
    }

    throw new CoreApiError(statusText, 'REQUEST_FAILED', status);
  }
}
