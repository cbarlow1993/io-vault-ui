import { coreApiClient } from '../client';
import {
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiSessionExpiredError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
  WorkflowNotFoundError,
} from '../errors';
import type {
  paths,
  WorkflowApproveInput,
  WorkflowConfirmInput,
  WorkflowRejectInput,
} from '../types';

type CreateWorkflowInput =
  paths['/v2/workflows/']['post']['requestBody']['content']['application/json'];

export class WorkflowRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async create(body: CreateWorkflowInput) {
    const { data, response } = await coreApiClient.POST('/v2/workflows/', {
      headers: this.headers,
      body,
    });

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async get(id: string) {
    const { data, response } = await coreApiClient.GET('/v2/workflows/{id}', {
      headers: this.headers,
      params: { path: { id } },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new WorkflowNotFoundError(id);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async approve(id: string, body: WorkflowApproveInput) {
    const { data, response } = await coreApiClient.POST(
      '/v2/workflows/{id}/approve',
      {
        headers: this.headers,
        params: { path: { id } },
        body,
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new WorkflowNotFoundError(id);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async reject(id: string, body: WorkflowRejectInput) {
    const { data, response } = await coreApiClient.POST(
      '/v2/workflows/{id}/reject',
      {
        headers: this.headers,
        params: { path: { id } },
        body,
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new WorkflowNotFoundError(id);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async confirm(id: string, body: WorkflowConfirmInput) {
    const { data, response } = await coreApiClient.POST(
      '/v2/workflows/{id}/confirm',
      {
        headers: this.headers,
        params: { path: { id } },
        body,
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new WorkflowNotFoundError(id);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async review(id: string) {
    const { data, response } = await coreApiClient.PUT(
      '/v2/workflows/{id}/review',
      {
        headers: this.headers,
        params: { path: { id } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new WorkflowNotFoundError(id);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async getHistory(id: string, params?: { limit?: number; cursor?: string }) {
    const { data, response } = await coreApiClient.GET(
      '/v2/workflows/{id}/history',
      {
        headers: this.headers,
        params: { path: { id }, query: params },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new WorkflowNotFoundError(id);
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
