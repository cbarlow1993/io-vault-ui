import { type ErrorReport, reportErrorToQueue } from '@/src/lib/error-reporter.js';

/**
 * Monitors API call performance and reports if it exceeds the threshold.
 * Unlike traditional timeouts, this does NOT abort the request - it just monitors and reports.
 *
 * @param apiCall Function that returns the API promise (not the promise itself)
 * @param errorContext Context for error reporting (endpoint, params, etc.)
 * @param thresholdMs Performance threshold in milliseconds (default: 15000ms / 15 seconds)
 * @returns Promise that resolves/rejects with the API call result
 *
 * @example
 * const result = await withPerformanceMonitoring(
 *   () => NovesEVMClient.getTransaction(chain, hash),
 *   {
 *     endpoint: 'NovesEVM.getTransaction',
 *     requestParams: { chain, hash }
 *   }
 * );
 */
export const withPerformanceMonitoring = async <T>(
  apiCall: () => Promise<T>,
  errorContext: {
    endpoint: string;
    requestParams: Record<string, unknown>;
    organizationId?: string;
    vaultId?: string;
  },
  thresholdMs = 15000
): Promise<T> => {
  let hasReported = false;

  // Start the performance monitoring timer
  const timeoutId = setTimeout(() => {
    hasReported = true;

    // Report performance NFR violation to error queue
    const errorReport: ErrorReport = {
      endpoint: errorContext.endpoint,
      errorType: 'PerformanceNFRViolation',
      errorMessage: `API call exceeded ${thresholdMs}ms performance threshold`,
      requestParams: errorContext.requestParams,
      timestamp: new Date().toISOString(),
      organizationId: errorContext.organizationId,
      vaultId: errorContext.vaultId,
    };

    // Fire and forget - don't await to avoid blocking the API call
    reportErrorToQueue(errorReport).catch((err) => {
      // Silently handle reporting errors - we don't want to fail the API call
      console.error('Failed to report performance issue:', err);
    });
  }, thresholdMs);

  try {
    // Execute the API call
    const result = await apiCall();

    // If completed within threshold, clear the timer
    if (!hasReported) {
      clearTimeout(timeoutId);
    }

    return result;
  } catch (error) {
    // Always clear timeout on error
    clearTimeout(timeoutId);
    throw error;
  }
};
