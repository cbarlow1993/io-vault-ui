import { InternalServerError, UserInputError } from '@iofinnet/errors-sdk';
import type { KnownError } from './types.js';

/**
 * Maps SDK error messages to HTTP errors
 * Throws the appropriate HTTP error if a match is found
 */
export function buildTransactionErrorToHttpError(
  errorMessage: string,
  knownErrors: Map<string, KnownError>
): never {
  const normalizedMessage = errorMessage.toLowerCase();

  for (const [pattern, error] of knownErrors) {
    if (normalizedMessage.includes(pattern.toLowerCase())) {
      if (error.status >= 500) {
        throw new InternalServerError(error.message);
      }
      throw new UserInputError(error.message);
    }
  }

  // Default to internal server error for unknown errors
  throw new InternalServerError(`Transaction build failed: ${errorMessage}`);
}
