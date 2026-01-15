import { coreApiClient } from '../client';
import {
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
} from '../errors';

export class ModuleRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async list() {
    const { data, response } = await coreApiClient.GET('/v2/modules/', {
      headers: this.headers,
    });

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async getRoles(moduleId: string) {
    const { data, response } = await coreApiClient.GET(
      '/v2/modules/{moduleId}/roles',
      {
        headers: this.headers,
        params: { path: { moduleId } },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async getActions(moduleId: string) {
    const { data, response } = await coreApiClient.GET(
      '/v2/modules/{moduleId}/actions',
      {
        headers: this.headers,
        params: { path: { moduleId } },
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
