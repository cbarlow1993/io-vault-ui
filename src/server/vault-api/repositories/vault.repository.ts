import { vaultApiClient } from '../client';
import {
  VaultApiError,
  VaultApiForbiddenError,
  VaultApiSessionExpiredError,
  VaultApiUnauthorizedError,
  VaultApiValidationError,
  VaultNotFoundError,
} from '../errors';
import type { CreateVaultInput, VaultListParams } from '../types';

export class VaultRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async list(params?: VaultListParams) {
    const { data, response } = await vaultApiClient.GET('/vaults', {
      headers: this.headers,
      params: { query: params },
    });

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async get(id: string) {
    const { data, response } = await vaultApiClient.GET('/vaults/{id}', {
      headers: this.headers,
      params: { path: { id } },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new VaultNotFoundError(id);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async create(input: CreateVaultInput) {
    const { data, response } = await vaultApiClient.POST('/vaults', {
      headers: this.headers,
      body: input,
    });

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  private handleError(response: Response): never {
    const { status, statusText } = response;

    if (status === 401) {
      throw new VaultApiUnauthorizedError(statusText);
    }
    if (status === 403) {
      throw new VaultApiForbiddenError(statusText);
    }
    if (status === 419) {
      throw new VaultApiSessionExpiredError(statusText);
    }
    if (status === 400) {
      throw new VaultApiValidationError(statusText);
    }

    throw new VaultApiError(statusText, 'REQUEST_FAILED', status);
  }
}
