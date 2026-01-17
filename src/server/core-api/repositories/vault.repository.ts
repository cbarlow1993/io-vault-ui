import { coreApiClient } from '../client';
import {
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiSessionExpiredError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
} from '../errors';
import type { paths } from '../types';

type CreateVaultInput =
  paths['/v2/vaults/']['post']['requestBody']['content']['application/json'];
type CreateVaultResponse =
  paths['/v2/vaults/']['post']['responses']['201']['content']['application/json'];

export class VaultRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async create(body: CreateVaultInput): Promise<CreateVaultResponse> {
    const { data, response } = await coreApiClient.POST('/v2/vaults/', {
      headers: this.headers,
      body,
    });

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
