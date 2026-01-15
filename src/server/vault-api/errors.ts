/**
 * Domain-specific errors for the Vault API layer.
 * These are independent of the transport layer (oRPC) to allow future swapping.
 */

export class VaultApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'VaultApiError';
  }
}

// Vault errors
export class VaultNotFoundError extends VaultApiError {
  constructor(vaultId: string) {
    super(`Vault not found: ${vaultId}`, 'VAULT_NOT_FOUND', 404);
  }
}

// Signer errors
export class SignerNotFoundError extends VaultApiError {
  constructor(signerId: string) {
    super(`Signer not found: ${signerId}`, 'SIGNER_NOT_FOUND', 404);
  }
}

// Reshare errors
export class ReshareNotFoundError extends VaultApiError {
  constructor(reshareId: string) {
    super(`Reshare not found: ${reshareId}`, 'RESHARE_NOT_FOUND', 404);
  }
}

// Signature errors
export class SignatureNotFoundError extends VaultApiError {
  constructor(signatureId: string) {
    super(`Signature not found: ${signatureId}`, 'SIGNATURE_NOT_FOUND', 404);
  }
}

// Auth errors
export class VaultApiUnauthorizedError extends VaultApiError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class VaultApiForbiddenError extends VaultApiError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

// Validation errors
export class VaultApiValidationError extends VaultApiError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

// Generic request errors
export class VaultApiRequestError extends VaultApiError {
  constructor(message: string, status: number, details?: unknown) {
    super(message, 'REQUEST_ERROR', status, details);
  }
}
