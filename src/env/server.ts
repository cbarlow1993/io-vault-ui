/* eslint-disable no-process-env */
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const isProd = process.env.NODE_ENV
  ? process.env.NODE_ENV === 'production'
  : import.meta.env?.PROD;

export const envServer = createEnv({
  server: {
    // Vault API
    VAULT_API_URL: z.url(),

    // Clerk authentication
    CLERK_SECRET_KEY: zOptionalWithReplaceMe(),
    CLERK_PUBLISHABLE_KEY: zOptionalWithReplaceMe(),

    LOGGER_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .prefault(isProd ? 'error' : 'info'),
    LOGGER_PRETTY: z
      .enum(['true', 'false'])
      .prefault(isProd ? 'false' : 'true')
      .transform((value) => value === 'true'),

    // Chargebee billing (optional - feature flagged)
    ENABLE_CHARGEBEE_BILLING: z
      .enum(['true', 'false'])
      .optional()
      .prefault('false')
      .transform((v) => v === 'true'),
    CHARGEBEE_SITE: zOptionalWithReplaceMe(),
    CHARGEBEE_API_KEY: zOptionalWithReplaceMe(),
    CHARGEBEE_WEBHOOK_SECRET: zOptionalWithReplaceMe(),
    // Comma-separated list of plan IDs to show in pricing grid (3-5 plans)
    CHARGEBEE_PLAN_IDS: z
      .string()
      .optional()
      .transform((v) =>
        v
          ?.split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      ),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

function zOptionalWithReplaceMe() {
  return z
    .string()
    .optional()
    .refine(
      (value) =>
        // Check in prodution if the value is not REPLACE ME
        !isProd || value !== 'REPLACE ME',
      {
        error: 'Update the value "REPLACE ME" or remove the variable',
      }
    )
    .transform((value) => (value === 'REPLACE ME' ? undefined : value));
}
