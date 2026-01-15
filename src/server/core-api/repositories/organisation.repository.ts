import { coreApiClient } from '../client';
import {
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
} from '../errors';
import type { paths } from '../types';

type SetGlobalRoleInput =
  paths['/v2/organisations/{orgId}/users/{userId}/global-role']['put']['requestBody']['content']['application/json'];
type AddModuleRoleInput =
  paths['/v2/organisations/{orgId}/users/{userId}/module-roles']['post']['requestBody']['content']['application/json'];

export class OrganisationRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async getUserRoles(orgId: string, userId: string) {
    const { data, response } = await coreApiClient.GET(
      '/v2/organisations/{orgId}/users/{userId}/roles',
      {
        headers: this.headers,
        params: { path: { orgId, userId } },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async setGlobalRole(orgId: string, userId: string, body: SetGlobalRoleInput) {
    const { data, response } = await coreApiClient.PUT(
      '/v2/organisations/{orgId}/users/{userId}/global-role',
      {
        headers: this.headers,
        params: { path: { orgId, userId } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async deleteGlobalRole(orgId: string, userId: string) {
    const { data, response } = await coreApiClient.DELETE(
      '/v2/organisations/{orgId}/users/{userId}/global-role',
      {
        headers: this.headers,
        params: { path: { orgId, userId } },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async addModuleRole(orgId: string, userId: string, body: AddModuleRoleInput) {
    const { data, response } = await coreApiClient.POST(
      '/v2/organisations/{orgId}/users/{userId}/module-roles',
      {
        headers: this.headers,
        params: { path: { orgId, userId } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async deleteModuleRole(orgId: string, userId: string, moduleId: string) {
    const { data, response } = await coreApiClient.DELETE(
      '/v2/organisations/{orgId}/users/{userId}/module-roles/{moduleId}',
      {
        headers: this.headers,
        params: { path: { orgId, userId, moduleId } },
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
