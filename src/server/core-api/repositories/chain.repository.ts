import { coreApiClient } from '../client';
import {
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiSessionExpiredError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
} from '../errors';
import type { ChainListParams } from '../types';

export class ChainRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async list(params?: ChainListParams) {
    const { data, response } = await coreApiClient.GET('/v2/chains/', {
      headers: this.headers,
      params: { query: params },
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
