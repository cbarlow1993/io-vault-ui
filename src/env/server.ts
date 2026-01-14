/* eslint-disable no-process-env */
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const isProd = process.env.NODE_ENV
  ? process.env.NODE_ENV === 'production'
  : import.meta.env?.PROD;

export const envServer = createEnv({
  server: {
    DATABASE_URL: z.url(),

    // Vault API
    VAULT_API_URL: z.url(),

    // Auth mode: 'clerk' for SaaS, 'better-auth' for on-prem
    AUTH_MODE: z.enum(['clerk', 'better-auth']).prefault('clerk'),

    // better-auth configuration
    AUTH_SECRET: z.string(),
    AUTH_SESSION_EXPIRATION_IN_SECONDS: z.coerce
      .number()
      .int()
      .prefault(2592000), // 30 days by default
    AUTH_SESSION_UPDATE_AGE_IN_SECONDS: z.coerce.number().int().prefault(86400), // 1 day by default
    AUTH_TRUSTED_ORIGINS: z
      .string()
      .optional()
      .transform((stringValue) => stringValue?.split(',').map((v) => v.trim())),

    // Clerk configuration (only required when AUTH_MODE='clerk')
    CLERK_SECRET_KEY: zOptionalWithReplaceMe(),
    CLERK_PUBLISHABLE_KEY: zOptionalWithReplaceMe(),

    // Social providers (optional)
    GITHUB_CLIENT_ID: zOptionalWithReplaceMe(),
    GITHUB_CLIENT_SECRET: zOptionalWithReplaceMe(),
    GOOGLE_CLIENT_ID: zOptionalWithReplaceMe(),
    GOOGLE_CLIENT_SECRET: zOptionalWithReplaceMe(),

    EMAIL_SERVER: z.url(),
    EMAIL_FROM: z.string(),

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
