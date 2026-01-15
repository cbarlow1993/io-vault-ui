import { vaultApiClient } from '../client';
import {
  SignatureNotFoundError,
  VaultApiError,
  VaultApiForbiddenError,
  VaultApiUnauthorizedError,
  VaultApiValidationError,
} from '../errors';
import type { CreateSignatureInput, SignatureListParams } from '../types';

export class SignatureRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async list(vaultId: string, params?: SignatureListParams) {
    const { data, response } = await vaultApiClient.GET(
      '/vaults/{vaultId}/signatures',
      {
        headers: this.headers,
        params: { path: { vaultId }, query: params },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async get(vaultId: string, id: string) {
    const { data, response } = await vaultApiClient.GET(
      '/vaults/{vaultId}/signatures/{id}',
      {
        headers: this.headers,
        params: { path: { vaultId, id } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new SignatureNotFoundError(id);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async create(vaultId: string, input: CreateSignatureInput) {
    const { data, response } = await vaultApiClient.POST(
      '/vaults/{vaultId}/signatures',
      {
        headers: this.headers,
        params: { path: { vaultId } },
        body: input,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async getVotes(vaultId: string, id: string) {
    const { data, response } = await vaultApiClient.GET(
      '/vaults/{vaultId}/signatures/{id}/votes',
      {
        headers: this.headers,
        params: { path: { vaultId, id } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new SignatureNotFoundError(id);
      }
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
    if (status === 400) {
      throw new VaultApiValidationError(statusText);
    }

    throw new VaultApiError(statusText, 'REQUEST_FAILED', status);
  }
}
