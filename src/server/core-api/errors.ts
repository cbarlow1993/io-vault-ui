/**
 * Domain-specific errors for the Core API layer.
 * These are independent of the transport layer (oRPC) to allow future swapping.
 */

export class CoreApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CoreApiError';
  }
}

// Not found errors
export class CoreApiNotFoundError extends CoreApiError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

export class AddressNotFoundError extends CoreApiError {
  constructor(address: string) {
    super(`Address not found: ${address}`, 'ADDRESS_NOT_FOUND', 404);
  }
}

export class WorkflowNotFoundError extends CoreApiError {
  constructor(workflowId: string) {
    super(`Workflow not found: ${workflowId}`, 'WORKFLOW_NOT_FOUND', 404);
  }
}

export class ReconciliationJobNotFoundError extends CoreApiError {
  constructor(jobId: string) {
    super(
      `Reconciliation job not found: ${jobId}`,
      'RECONCILIATION_JOB_NOT_FOUND',
      404
    );
  }
}

// Auth errors
export class CoreApiUnauthorizedError extends CoreApiError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class CoreApiForbiddenError extends CoreApiError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

// Validation errors
export class CoreApiValidationError extends CoreApiError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

// Generic request errors
export class CoreApiRequestError extends CoreApiError {
  constructor(message: string, status: number, details?: unknown) {
    super(message, 'REQUEST_ERROR', status, details);
  }
}
