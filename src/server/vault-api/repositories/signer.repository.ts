import { vaultApiClient } from '../client';
import {
  VaultApiError,
  VaultApiForbiddenError,
  VaultApiSessionExpiredError,
  VaultApiUnauthorizedError,
  VaultApiValidationError,
} from '../errors';
import type { RegisterSignerInput, SignerListParams } from '../types';

export class SignerRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async list(params?: SignerListParams) {
    const { data, response } = await vaultApiClient.GET('/signers', {
      headers: this.headers,
      params: { query: params },
    });

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async register(input: RegisterSignerInput) {
    const { data, response } = await vaultApiClient.POST('/signers', {
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
