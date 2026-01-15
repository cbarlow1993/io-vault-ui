import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';
import { logger } from '@/utils/powertools.js';

export interface PolicyDecisionLogEntry {
  organisationId: string;
  userId: string;
  module: string;
  action: string;
  resource?: Record<string, unknown>;
  decision: 'allow' | 'deny';
  reason?: string;
  matchedRole?: string;
  requestId?: string;
  endpoint?: string;
  evaluationTimeMs?: number;
}

interface PolicyDecisionLoggerOptions {
  batchSize?: number;
  flushIntervalMs?: number;
}

export class PolicyDecisionLogger {
  private queue: PolicyDecisionLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private batchSize: number;

  constructor(
    private db: Kysely<Database>,
    options: PolicyDecisionLoggerOptions = {}
  ) {
    this.batchSize = options.batchSize ?? 100;
    const flushIntervalMs = options.flushIntervalMs ?? 5000;

    this.flushInterval = setInterval(() => {
      this.flush();
    }, flushIntervalMs);
  }

  log(entry: PolicyDecisionLogEntry): void {
    this.queue.push(entry);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  async stop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);

    try {
      await this.db
        .insertInto('policy_decisions')
        .values(
          batch.map((entry) => ({
            organisation_id: entry.organisationId,
            user_id: entry.userId,
            module: entry.module,
            action: entry.action,
            resource: entry.resource ? JSON.stringify(entry.resource) : null,
            decision: entry.decision,
            reason: entry.reason ?? null,
            matched_role: entry.matchedRole ?? null,
            request_id: entry.requestId ?? null,
            endpoint: entry.endpoint ?? null,
            evaluation_time_ms: entry.evaluationTimeMs ?? null,
          }))
        )
        .execute();
    } catch (error) {
      // Log error but don't throw - decision logging is not critical path
      logger.error('Failed to flush policy decisions', { error });
      // Re-queue failed items (up to limit to prevent memory leak)
      if (this.queue.length < 1000) {
        this.queue.unshift(...batch);
      }
    }
  }
}
