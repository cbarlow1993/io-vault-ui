import { logger } from '@/utils/powertools.js';

export interface ErrorReport {
  endpoint: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  requestParams: Record<string, unknown>;
  timestamp: string;
  organizationId?: string;
  vaultId?: string;
}

/**
 * Stub error reporter for standalone mode.
 * Logs errors locally instead of sending to SQS.
 */
export const reportErrorToQueue = async (errorReport: ErrorReport): Promise<void> => {
  logger.error('Error reported (standalone mode - not sent to queue)', {
    endpoint: errorReport.endpoint,
    errorType: errorReport.errorType,
    errorMessage: errorReport.errorMessage,
    organizationId: errorReport.organizationId,
    vaultId: errorReport.vaultId,
  });
};
