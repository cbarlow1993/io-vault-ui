import { coreApiClient } from '../client';
import {
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
  ReconciliationJobNotFoundError,
} from '../errors';
import type { ChainAlias } from '../types';

export class ReconciliationRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async reconcile(address: string, chainAlias: ChainAlias) {
    const { data, response } = await coreApiClient.POST(
      '/v2/reconciliation/addresses/{address}/chain/{chainAlias}/reconcile',
      {
        headers: this.headers,
        params: { path: { address, chainAlias } },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async listJobs(address: string, chainAlias: ChainAlias) {
    const { data, response } = await coreApiClient.GET(
      '/v2/reconciliation/addresses/{address}/chain/{chainAlias}/reconciliation-jobs',
      {
        headers: this.headers,
        params: { path: { address, chainAlias } },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async getJob(jobId: string) {
    const { data, response } = await coreApiClient.GET(
      '/v2/reconciliation/reconciliation-jobs/{jobId}',
      {
        headers: this.headers,
        params: { path: { jobId } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new ReconciliationJobNotFoundError(jobId);
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
    if (status === 400) {
      throw new CoreApiValidationError(statusText);
    }

    throw new CoreApiError(statusText, 'REQUEST_FAILED', status);
  }
}
